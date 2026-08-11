/**
 * @param element {HTMLElement|HTMLDocument}
 */
export function initializeDataVeCustomElement(element = document) {
  for (const element of document.querySelectorAll('[data-ve-custom-element]')) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }
    /**
     * @var data {{tag:string, arguments: Record<string, string>}}
     */
    const data = JSON.parse(element.dataset.veCustomElement);
    const newTag = document.createElement(data.tag);
    for (const key in data.arguments) {
      newTag.setAttribute(key, data.arguments[key]);
    }
    newTag.innerHTML = data.content;
    element.parentElement.replaceChild(newTag, element);
  }
}
