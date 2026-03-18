<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Exception;
use Firebase\JWT\ExpiredException;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\UriInterface;
use Symfony\Component\HttpFoundation\Cookie;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Error\Http\UnauthorizedException;
use TYPO3\CMS\Core\Http\NormalizedParams;
use TYPO3\CMS\Core\Http\SetCookieService;
use TYPO3\CMS\Core\Security\JwtTrait;
use TYPO3\CMS\Core\Session\UserSession;
use TYPO3\CMS\Core\Session\UserSessionManager;

use function array_values;
use function hash_equals;

/**
 * SessionTransferTokens are one time use,
 */
final readonly class SessionTransferService
{
    use JwtTrait;

    /**
     * returns the session cookie if it needs to be set/updated
     */
    public function createCookieIfNeeded(ServerRequestInterface $request, string $sessionTransferToken): ?Cookie
    {
        $normalizedParams = $request->getAttribute('normalizedParams');
        if (!$normalizedParams instanceof NormalizedParams) {
            throw new Exception('NormalizedParams not found in request attributes', 9890374332);
        }

        $sessionId = $this->getSessionIdentifier($sessionTransferToken, $request);
        // you have given a valid sessionTransferToken, so we can create the cookie with confidence

        if (($GLOBALS['BE_USER'] ?? null)?->getSession()?->getIdentifier() === $sessionId) {
            // we already have the correct session, we only consume the Token and then do nothing.
            $this->consumeToken($this->getBackendUserAuthentication()->getSession(), $sessionTransferToken);
            return null;
        }

        // load session from different origin:
        $userSession = UserSessionManager::create('BE')->createSessionFromStorage($sessionId);

        // check and consume token or throw Exception
        $userSession = $this->consumeToken($userSession, $sessionTransferToken);

        // recreate userSession to set markAsNew = true, otherwise we can not use setSessionCookie
        $userSession = UserSession::createFromRecord($userSession->getIdentifier(), $userSession->toArray(), true);

        $setCookieService = SetCookieService::create(BackendUserAuthentication::getCookieName(), 'BE');

        return $setCookieService->setSessionCookie($userSession, $normalizedParams)
            ?? throw new Exception('Failed to create session cookie', 1958548954);
    }

    public function createSessionTransferTokenIfNeeded(UriInterface $allowedOrigin, ServerRequestInterface $request): ?string
    {
        if ($this->getOriginFromUri($allowedOrigin) === $this->getOriginFromUri($request->getUri())) {
            return null;
        }

        $backendUserAuthentication = $this->getBackendUserAuthentication();
        $session = $backendUserAuthentication->getSession();
        $token = self::encodeHashSignedJwt(
            [
                // wrap sessionId into new JWT so it can not be used as value for be_typo_user cookie
                'identifier' => $session->getIdentifier(),
                // only allow setting the session for this origin:
                'allowedOrigin' => $this->getOriginFromUri($allowedOrigin),
                // only allow for the same client IP:
                'allowedClientIp' => $this->getClientIp($request),
                // low timeout of the JWT to ensure it is only valid for a short time and reduces the risk of token leakage:
                'exp' => time() + 10,
            ],
            self::createSigningKeyFromEncryptionKey(SessionTransferService::class),
        );

        // keep track of the created token, to make then one time use
        $tokens = $this->loadTransferTokens($session);
        $tokens[] = $token;
        $backendUserAuthentication->setAndSaveSessionData('SessionTransferTokens', $tokens);
        return $token;
    }

    private function getSessionIdentifier(string $token, ServerRequestInterface $request): string
    {
        // validates JWT with private key and validates low timeout of the JWT
        $payload = self::decodeJwt($token, self::createSigningKeyFromEncryptionKey(SessionTransferService::class));

        // compare allowedOrigin with current Origin.
        if (!hash_equals($payload->allowedOrigin ?? '', $this->getOriginFromUri($request->getUri()))) {
            throw new UnauthorizedException('Origin not allowed', 9620233479);
        }

        // compare allowedClientIp with current clientIp
        if (!hash_equals($payload->allowedClientIp ?? '', $this->getClientIp($request))) {
            throw new UnauthorizedException('Client IP not allowed', 3530698687);
        }

        return $payload->identifier ?? throw new Exception('Session identifier not found in request attributes', 8796121015);
    }

    private function getClientIp(ServerRequestInterface $request): string
    {
        $normalizedParams = $request->getAttribute('normalizedParams');
        if (!$normalizedParams instanceof NormalizedParams) {
            throw new InvalidArgumentException('"normalizedParams" not found in request attributes', 1772441095);
        }

        return $normalizedParams->getRemoteAddress();
    }

    private function getOriginFromUri(UriInterface $allowedOrigin): string
    {
        return $allowedOrigin->withQuery('')->withFragment('')->withUserInfo('')->withPath('')->__toString();
    }

    private function getBackendUserAuthentication(): BackendUserAuthentication
    {
        $backendUser = $GLOBALS['BE_USER'] ?? null;
        if (!$backendUser instanceof BackendUserAuthentication) {
            throw new InvalidArgumentException('No backend user found', 7146700018);
        }

        return $backendUser;
    }

    /**
     * @return list<string>
     */
    private function loadTransferTokens(UserSession $session): array
    {
        $result = [];
        foreach ($session->get('SessionTransferTokens') ?? [] as $token) {
            try {
                self::decodeJwt($token, self::createSigningKeyFromEncryptionKey(SessionTransferService::class));
            } catch (ExpiredException) {
                // token is expired, remove it from the list of valid tokens
                continue;
            }

            $result[] = $token;
        }

        return $result;
    }

    private function consumeToken(UserSession $userSession, string $sessionTransferToken): UserSession
    {
        $validTokens = $this->loadTransferTokens($userSession);
        foreach ($validTokens as $index => $token) {
            if (!hash_equals($token, $sessionTransferToken)) {
                continue;
            }

            // token is valid, we now remove it from the list of valid tokens to prevent reuse
            unset($validTokens[$index]);
            // can not use BackendUserAuthentication->setAndSaveSessionData here, because the session is a different one
            $userSession->set('SessionTransferTokens', array_values($validTokens));
            return UserSessionManager::create('BE')->updateSession($userSession);
        }

        throw new UnauthorizedException('Invalid token was already consumed', 5646002872);
    }
}
