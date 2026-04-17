export function initializePageTreeSaveState() {
  if (!window.top.veDoNotRegisterStateChangeListenerForPageTree) {
    // for internal page reloads (middle Iframe) we do not want to change the state of the navigation state.
    window.top.veDoNotRegisterStateChangeListenerForPageTree = true;

    window.top.document.addEventListener('typo3:content-navigation:state-change', () => {
      const element = document.querySelector('typo3-backend-content-navigation-toggle');
      const isOpen = element.hidden;
      const shouldBeOpen = sessionStorage.getItem('ve-page-tree-open') === 'true';
      // XOR to check if the state is different, if so, toggle it by clicking the button
      if (isOpen ^ shouldBeOpen) {
        element.click();
      }
    }, {once: true});
  }

  // save state
  window.top.document.addEventListener('typo3:content-navigation:state-change', () => {
    setTimeout(() => {
      const element = document.querySelector('typo3-backend-content-navigation-toggle');
      const isOpen = element.hidden;
      sessionStorage.setItem('ve-page-tree-open', isOpen);
    });
  });
}
