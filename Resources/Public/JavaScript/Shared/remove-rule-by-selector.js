/**
 *
 * @param selector {string}
 * @param root {Document|ShadowRoot}
 * @returns {number}
 */
export function removeRuleBySelector(selector, root = document) {
  let removed = 0;

  // Walk all stylesheets (only same-origin or <style> tags are readable)
  for (const sheet of root.styleSheets) {
    try {
      removed += pruneInSheet(sheet, selector);
    } catch {
      // Cross-origin stylesheets throw SecurityError when reading cssRules — skip them
    }
  }
  return removed;
}

//
/**
 * Recursively walk normal and grouping rules (@media, @supports, etc.)
 * @param sheetOrGroup {CSSStyleSheet|CSSGroupingRule}
 * @param selector {string}
 * @returns {number}
 */
function pruneInSheet(sheetOrGroup, selector) {
  const rules = sheetOrGroup.cssRules;
  let count = 0;

  // Iterate backwards so deleteRule doesn't shift later indices
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];

    if (rule instanceof CSSStyleRule || 'selectorText' in rule) {
      // Rule with one or more comma-separated selectors
      const selectors = rule.selectorText.split(',').map(s => s.trim());
      if (selectors.includes(selector)) {
        if (selectors.length === 1) {
          sheetOrGroup.deleteRule(i); // remove the whole rule
        } else {
          // If the rule is a group (e.g. ".a, .b { ... }"), keep others
          const remaining = selectors.filter(s => s !== selector).join(', ');
          const decls = rule.style.cssText; // preserve declarations
          sheetOrGroup.deleteRule(i);
          sheetOrGroup.insertRule(`${remaining} { ${decls} }`, i);
        }
        count++;
      }
    } else if ('cssRules' in rule) {
      // e.g., CSSMediaRule, CSSSupportsRule
      count += pruneInSheet(rule, selector);
    }
  }
  return count;
}
