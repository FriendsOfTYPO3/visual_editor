#!/usr/bin/env bash

set -eu

if [ "${CI:-}" != "true" ]; then
    trap 'echo "runTests.sh SIGINT signal emitted"; cleanUp; exit 2' SIGINT
fi

cleanUp() {
    # remove the infinite recursion symlink
    rm -rf ./public/typo3temp/var/tests/functional-*/typo3conf/ext/visual_editor
    if [ -n "${NETWORK_CREATED:-}" ]; then
        ATTACHED_CONTAINERS=$(${CONTAINER_BIN} ps --filter network=${NETWORK} --format='{{.Names}}' 2>/dev/null || true)
        for ATTACHED_CONTAINER in ${ATTACHED_CONTAINERS}; do
            ${CONTAINER_BIN} kill ${ATTACHED_CONTAINER} >/dev/null 2>&1 || true
        done
        ${CONTAINER_BIN} network rm ${NETWORK} >/dev/null 2>&1 || true
    fi
}

waitFor() {
    local HOST=${1}
    local PORT=${2}
    [[ -n "${3:-}" ]] && echo -n "Startup wait of $3 ... " && sleep "$3" && echo "done"
    local TESTCOMMAND="
        COUNT=0;
        while ! nc -z ${HOST} ${PORT}; do
            if [ \"\${COUNT}\" -gt 30 ]; then
                echo \"Can not connect to ${HOST} port ${PORT}. Aborting.\";
                exit 1;
            fi;
            sleep 1;
            COUNT=\$((COUNT + 1));
        done;
    "
    ${CONTAINER_BIN} run ${CONTAINER_COMMON_PARAMS} --name wait-for-${SUFFIX} ${XDEBUG_MODE} -e XDEBUG_CONFIG="${XDEBUG_CONFIG}" ${IMAGE_ALPINE} /bin/sh -c "${TESTCOMMAND}"
    if [[ $? -gt 0 ]]; then
        kill -SIGINT -$$
    fi
}

handleDbmsOptions() {
    case ${DBMS} in
        mariadb)
            if [ -z "${DATABASE_DRIVER}" ]; then
                DATABASE_DRIVER="mysqli"
            fi
            if [ "${DATABASE_DRIVER}" != "mysqli" ] && [ "${DATABASE_DRIVER}" != "pdo_mysql" ]; then
                echo "Invalid combination -d ${DBMS} -a ${DATABASE_DRIVER}" >&2
                exit 1
            fi
            if [ -z "${DBMS_VERSION}" ]; then
                DBMS_VERSION="10.11"
            fi
            ;;
        mysql)
            if [ -z "${DATABASE_DRIVER}" ]; then
                DATABASE_DRIVER="mysqli"
            fi
            if [ "${DATABASE_DRIVER}" != "mysqli" ] && [ "${DATABASE_DRIVER}" != "pdo_mysql" ]; then
                echo "Invalid combination -d ${DBMS} -a ${DATABASE_DRIVER}" >&2
                exit 1
            fi
            if [ -z "${DBMS_VERSION}" ]; then
                DBMS_VERSION="8.4"
            fi
            ;;
        postgres)
            if [ -n "${DATABASE_DRIVER}" ]; then
                echo "Invalid combination -d ${DBMS} -a ${DATABASE_DRIVER}" >&2
                exit 1
            fi
            if [ -z "${DBMS_VERSION}" ]; then
                DBMS_VERSION="16"
            fi
            ;;
        sqlite)
            if [ -n "${DATABASE_DRIVER}" ]; then
                echo "Invalid combination -d ${DBMS} -a ${DATABASE_DRIVER}" >&2
                exit 1
            fi
            if [ -n "${DBMS_VERSION}" ]; then
                echo "Invalid combination -d ${DBMS} -i ${DBMS_VERSION}" >&2
                exit 1
            fi
            ;;
        *)
            echo "Invalid option -d ${DBMS}" >&2
            exit 1
            ;;
    esac
}

loadHelp() {
    read -r -d '' HELP <<EOF || true
Usage: $0 [options] [phpunit args]

Options:
  -s <unit|functional>    Test suite to run
  -b <docker|podman>      Container runtime
  -p <8.2|8.3|8.4|8.5>    PHP version (default: 8.2)
  -d <sqlite|mariadb|mysql|postgres>
                          Functional DBMS (default: sqlite)
  -a <mysqli|pdo_mysql>   DB driver for mysql/mariadb
  -i <version>            Specific DBMS version
  -x                      Enable xdebug
  -y <port>               Xdebug port (default: 9003)
  -h                      Show help

Examples:
  ./Build/Scripts/runTests.sh -s unit
  ./Build/Scripts/runTests.sh -s functional
  ./Build/Scripts/runTests.sh -s functional -d sqlite -- --filter LocalizationServiceTest
EOF
}

if ! type "docker" >/dev/null 2>&1 && ! type "podman" >/dev/null 2>&1; then
    echo "This script relies on docker or podman. Please install one of them." >&2
    exit 1
fi

THIS_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
cd "$THIS_SCRIPT_DIR" || exit 1
cd ../../ || exit 1
CORE_ROOT="${PWD}"

TEST_SUITE="help"
DBMS="sqlite"
DBMS_VERSION=""
PHP_VERSION="8.2"
PHP_XDEBUG_ON=0
PHP_XDEBUG_PORT=9003
DATABASE_DRIVER=""
CONTAINER_BIN=""
CONTAINER_INTERACTIVE="-it --init"
CONTAINER_HOST="host.docker.internal"
HOST_UID=$(id -u)
HOST_PID=$(id -g)
USERSET=""
SUFFIX=$(echo $RANDOM)
NETWORK="visual-editor-${SUFFIX}"
NETWORK_CREATED=""
NETWORK_PARAM=""

if [ "${CI:-}" = "true" ]; then
    CONTAINER_INTERACTIVE=""
fi

OPTIND=1
while getopts "a:b:s:d:i:p:xy:h" OPT; do
    case ${OPT} in
        s) TEST_SUITE=${OPTARG} ;;
        b) CONTAINER_BIN=${OPTARG} ;;
        a) DATABASE_DRIVER=${OPTARG} ;;
        d) DBMS=${OPTARG} ;;
        i) DBMS_VERSION=${OPTARG} ;;
        p) PHP_VERSION=${OPTARG} ;;
        x) PHP_XDEBUG_ON=1 ;;
        y) PHP_XDEBUG_PORT=${OPTARG} ;;
        h) TEST_SUITE="help" ;;
        *) TEST_SUITE="help" ;;
    esac
done

handleDbmsOptions

if [[ -z "${CONTAINER_BIN}" ]]; then
    if type "docker" >/dev/null 2>&1; then
        CONTAINER_BIN="docker"
    else
        CONTAINER_BIN="podman"
    fi
fi

if ! type "${CONTAINER_BIN}" >/dev/null 2>&1; then
    echo "Selected container environment \"${CONTAINER_BIN}\" not found." >&2
    exit 1
fi

if [ "$(uname)" != "Darwin" ] && [ "${CONTAINER_BIN}" = "docker" ]; then
    USERSET="--user ${HOST_UID}"
fi

IMAGE_PHP="ghcr.io/typo3/core-testing-$(echo "php${PHP_VERSION}" | sed -e 's/\.//'):latest"
IMAGE_ALPINE="docker.io/alpine:3.8"
IMAGE_MARIADB="docker.io/mariadb:${DBMS_VERSION}"
IMAGE_MYSQL="docker.io/mysql:${DBMS_VERSION}"
IMAGE_POSTGRES="docker.io/postgres:${DBMS_VERSION}-alpine"

shift $((OPTIND - 1))

mkdir -p .cache public/typo3temp/var/tests

if [ "${TEST_SUITE}" = "functional" ] && [ "${DBMS}" != "sqlite" ]; then
    if [ "${CONTAINER_BIN}" = "docker" ]; then
        NETWORK_PARAM="--network bridge"
    else
        ${CONTAINER_BIN} network create ${NETWORK} >/dev/null
        NETWORK_CREATED=1
        NETWORK_PARAM="--network ${NETWORK}"
    fi
fi

if [ "${CONTAINER_BIN}" = "docker" ]; then
    CONTAINER_COMMON_PARAMS="${CONTAINER_INTERACTIVE} --rm --add-host ${CONTAINER_HOST}:host-gateway ${USERSET} -e TYPO3_PATH_ROOT=${CORE_ROOT}/public -e TYPO3_PATH_WEB=${CORE_ROOT}/public -v ${CORE_ROOT}:${CORE_ROOT} -w ${CORE_ROOT}"
else
    CONTAINER_HOST="host.containers.internal"
    CONTAINER_COMMON_PARAMS="${CONTAINER_INTERACTIVE} --rm -e TYPO3_PATH_ROOT=${CORE_ROOT}/public -e TYPO3_PATH_WEB=${CORE_ROOT}/public -v ${CORE_ROOT}:${CORE_ROOT} -w ${CORE_ROOT}"
fi

if [ -n "${NETWORK_PARAM}" ]; then
    CONTAINER_COMMON_PARAMS="${CONTAINER_COMMON_PARAMS} ${NETWORK_PARAM}"
fi

if [ ${PHP_XDEBUG_ON} -eq 0 ]; then
    XDEBUG_MODE="-e XDEBUG_MODE=off"
    XDEBUG_CONFIG=" "
else
    XDEBUG_MODE="-e XDEBUG_MODE=debug -e XDEBUG_TRIGGER=foo"
    XDEBUG_CONFIG="client_port=${PHP_XDEBUG_PORT} client_host=${CONTAINER_HOST}"
fi

SUITE_EXIT_CODE=1
case ${TEST_SUITE} in
    unit)
        ${CONTAINER_BIN} run ${CONTAINER_COMMON_PARAMS} --name unit-${SUFFIX} ${XDEBUG_MODE} -e XDEBUG_CONFIG="${XDEBUG_CONFIG}" ${IMAGE_PHP} vendor/bin/phpunit -c Build/phpunit/UnitTests.xml "$@"
        SUITE_EXIT_CODE=$?
        ;;
    functional)
        COMMAND=(vendor/bin/phpunit -c Build/phpunit/FunctionalTests.xml --exclude-group not-${DBMS} "$@")
        case ${DBMS} in
            mariadb)
                ${CONTAINER_BIN} run --rm --name mariadb-func-${SUFFIX} ${NETWORK_PARAM} -d -e MYSQL_ROOT_PASSWORD=funcp --tmpfs /var/lib/mysql/:rw,noexec,nosuid ${IMAGE_MARIADB} >/dev/null
                DATABASE_HOST=mariadb-func-${SUFFIX}
                if [ "${CONTAINER_BIN}" = "docker" ]; then
                    DATABASE_HOST=$(${CONTAINER_BIN} inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mariadb-func-${SUFFIX})
                fi
                waitFor ${DATABASE_HOST} 3306
                CONTAINERPARAMS="-e typo3DatabaseDriver=${DATABASE_DRIVER} -e typo3DatabaseName=func_test -e typo3DatabaseUsername=root -e typo3DatabaseHost=${DATABASE_HOST} -e typo3DatabasePassword=funcp"
                ${CONTAINER_BIN} run --rm ${CONTAINER_COMMON_PARAMS} --name functional-${SUFFIX} ${XDEBUG_MODE} -e XDEBUG_CONFIG="${XDEBUG_CONFIG}" ${CONTAINERPARAMS} ${IMAGE_PHP} "${COMMAND[@]}"
                SUITE_EXIT_CODE=$?
                ;;
            mysql)
                ${CONTAINER_BIN} run --rm --name mysql-func-${SUFFIX} ${NETWORK_PARAM} -d -e MYSQL_ROOT_PASSWORD=funcp --tmpfs /var/lib/mysql/:rw,noexec,nosuid ${IMAGE_MYSQL} >/dev/null
                DATABASE_HOST=mysql-func-${SUFFIX}
                if [ "${CONTAINER_BIN}" = "docker" ]; then
                    DATABASE_HOST=$(${CONTAINER_BIN} inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mysql-func-${SUFFIX})
                fi
                waitFor ${DATABASE_HOST} 3306 2
                CONTAINERPARAMS="-e typo3DatabaseDriver=${DATABASE_DRIVER} -e typo3DatabaseName=func_test -e typo3DatabaseUsername=root -e typo3DatabaseHost=${DATABASE_HOST} -e typo3DatabasePassword=funcp"
                ${CONTAINER_BIN} run --rm ${CONTAINER_COMMON_PARAMS} --name functional-${SUFFIX} ${XDEBUG_MODE} -e XDEBUG_CONFIG="${XDEBUG_CONFIG}" ${CONTAINERPARAMS} ${IMAGE_PHP} "${COMMAND[@]}"
                SUITE_EXIT_CODE=$?
                ;;
            postgres)
                ${CONTAINER_BIN} run --rm --name postgres-func-${SUFFIX} ${NETWORK_PARAM} -d -e POSTGRES_PASSWORD=funcp -e POSTGRES_USER=funcu --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid ${IMAGE_POSTGRES} >/dev/null
                DATABASE_HOST=postgres-func-${SUFFIX}
                if [ "${CONTAINER_BIN}" = "docker" ]; then
                    DATABASE_HOST=$(${CONTAINER_BIN} inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' postgres-func-${SUFFIX})
                fi
                waitFor ${DATABASE_HOST} 5432
                CONTAINERPARAMS="-e typo3DatabaseDriver=pdo_pgsql -e typo3DatabaseName=func_test -e typo3DatabaseUsername=funcu -e typo3DatabaseHost=${DATABASE_HOST} -e typo3DatabasePassword=funcp"
                ${CONTAINER_BIN} run --rm ${CONTAINER_COMMON_PARAMS} --name functional-${SUFFIX} ${XDEBUG_MODE} -e XDEBUG_CONFIG="${XDEBUG_CONFIG}" ${CONTAINERPARAMS} ${IMAGE_PHP} "${COMMAND[@]}"
                SUITE_EXIT_CODE=$?
                ;;
            sqlite)
                rm -rf "${CORE_ROOT}/public/typo3temp/var/tests/functional-sqlite-dbs"
                mkdir -p "${CORE_ROOT}/public/typo3temp/var/tests/functional-sqlite-dbs/"
                CONTAINERPARAMS="-e typo3DatabaseDriver=pdo_sqlite"
                ${CONTAINER_BIN} run --rm ${CONTAINER_COMMON_PARAMS} --name functional-${SUFFIX} ${XDEBUG_MODE} -e XDEBUG_CONFIG="${XDEBUG_CONFIG}" ${CONTAINERPARAMS} ${IMAGE_PHP} "${COMMAND[@]}"
                SUITE_EXIT_CODE=$?
                ;;
        esac
        ;;
    help)
        loadHelp
        echo "${HELP}"
        SUITE_EXIT_CODE=0
        ;;
    *)
        loadHelp
        echo "${HELP}" >&2
        SUITE_EXIT_CODE=1
        ;;
esac

cleanUp
exit ${SUITE_EXIT_CODE}
