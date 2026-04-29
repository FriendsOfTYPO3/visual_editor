/**
 * Returns the ARIA role for a given HTML tag name.
 * @param tagName {string}
 * @return {string|null}
 */
export function getAriaRole(tagName) {
  const roles = {
    // Root / document
    html: 'document',
    body: 'document',

    // Metadata
    base: null,
    head: null,
    link: null,
    meta: null,
    style: null,
    title: null,

    // Sectioning
    address: 'group',
    article: 'article',
    aside: 'complementary',
    footer: 'contentinfo',
    header: 'banner',
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    h5: 'heading',
    h6: 'heading',
    hgroup: 'group',
    main: 'main',
    nav: 'navigation',
    section: 'region',
    search: 'search',

    // Grouping content
    blockquote: 'blockquote',
    dd: 'definition',
    div: null,
    dl: 'list',
    dt: 'term',
    figcaption: 'caption',
    figure: 'figure',
    hr: 'separator',
    li: 'listitem',
    menu: 'list',
    ol: 'list',
    p: 'paragraph',
    pre: null,
    ul: 'list',

    // Text-level semantics
    a: 'link',
    abbr: null,
    b: null,
    bdi: null,
    bdo: null,
    br: null,
    cite: null,
    code: 'code',
    data: null,
    dfn: 'term',
    em: 'emphasis',
    i: null,
    kbd: null,
    mark: 'mark',
    q: null,
    rp: null,
    rt: null,
    ruby: null,
    s: 'deletion',
    samp: null,
    small: null,
    span: null,
    strong: 'strong',
    sub: 'subscript',
    sup: 'superscript',
    time: 'time',
    u: null,
    var: null,
    wbr: null,

    // Edits
    del: 'deletion',
    ins: 'insertion',

    // Embedded content
    area: 'link',
    audio: null,
    canvas: null,
    embed: null,
    iframe: null,
    img: 'img',
    map: null,
    object: null,
    picture: null,
    source: null,
    track: null,
    video: null,

    // SVG / MathML
    svg: 'graphics-document',
    math: 'math',

    // Tables
    table: 'table',
    caption: 'caption',
    col: null,
    colgroup: null,
    tbody: 'rowgroup',
    td: 'cell',
    tfoot: 'rowgroup',
    th: 'columnheader',
    thead: 'rowgroup',
    tr: 'row',

    // Forms
    button: 'button',
    datalist: 'listbox',
    fieldset: 'group',
    form: 'form',
    input: 'textbox',
    label: null,
    legend: null,
    meter: 'meter',
    optgroup: 'group',
    option: 'option',
    output: 'status',
    progress: 'progressbar',
    select: 'combobox',
    selectedcontent: null,
    textarea: 'textbox',

    // Interactive elements
    details: 'group',
    dialog: 'dialog',
    summary: 'button',

    // Web components
    slot: null,
    template: null,

    // Scripting
    noscript: null,
    script: null,

    // Deprecated / obsolete but still seen
    acronym: null,
    applet: null,
    basefont: null,
    bgsound: null,
    big: null,
    blink: null,
    center: null,
    command: null,
    content: null,
    dir: 'list',
    font: null,
    frame: null,
    frameset: null,
    image: 'img',
    isindex: null,
    keygen: null,
    marquee: null,
    menuitem: 'menuitem',
    nobr: null,
    noembed: null,
    noframes: null,
    param: null,
    plaintext: null,
    rb: null,
    rtc: null,
    shadow: null,
    spacer: null,
    strike: 'deletion',
    tt: null,
    xmp: null,
  };

  return roles[tagName.toLowerCase()] ?? null;
}
