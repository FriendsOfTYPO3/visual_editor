/**
 * Enables auto-scrolling while dragging near the viewport edge.
 *
 * usage:
 * ```js
 *    // inside dragStart event handler:
 *    initVelocityScroll(event);
 * ```
 *
 * @param event {DragEvent}
 */
export function initVelocityScroll(event) {
  let scrollSpeedVertical = 0;
  let scrollSpeedHorizontal = 0;

  let active = true;

  let lastFrameTime = Date.now();
  const interval = () => {

    const fps = 1000 / (Date.now() - lastFrameTime);
    lastFrameTime = Date.now();

    const newVerticalScrollPosition = document.scrollingElement.scrollTop + scrollSpeedVertical / fps;
    const maxVerticalScrollPosition = document.scrollingElement.scrollHeight - window.innerHeight;
    const limitedVerticalScrollPosition = Math.max(0, Math.min(newVerticalScrollPosition, maxVerticalScrollPosition));

    const newHorizontalScrollPosition = document.scrollingElement.scrollLeft + scrollSpeedHorizontal / fps;
    const maxHorizontalScrollPosition = document.scrollingElement.scrollWidth - window.innerWidth;
    const limitedHorizontalScrollPosition = Math.max(0, Math.min(newHorizontalScrollPosition, maxHorizontalScrollPosition));

    // disable smooth scrolling temporarily
    const oldSmoothScrollingBehavior = document.scrollingElement.style.scrollBehavior;
    document.scrollingElement.style.scrollBehavior = 'auto';

    document.scrollingElement.scrollTop = limitedVerticalScrollPosition;
    document.scrollingElement.scrollLeft = limitedHorizontalScrollPosition;

    // reset smooth scrolling
    document.scrollingElement.style.scrollBehavior = oldSmoothScrollingBehavior;

    if (active) {
      requestAnimationFrame(interval);
    }
  }
  interval();

  const autoScroll = event => {
    const verticalEdgeOfWindow = window.innerHeight * 0.2;
    const horizontalEdgeOfWindow = window.innerWidth * 0.2;
    const maxVerticalScrollStrength = window.innerHeight * 2.5;
    const maxHorizontalScrollStrength = window.innerWidth * 2.5;
    // scroll zone progress goes from 0 to 1:
    // 0 means the cursor just entered the scroll zone,
    // 1 means the cursor is at the viewport edge
    const maxProgress = 1;
    let verticalScrollAmount = 0;
    let horizontalScrollAmount = 0;

    // from the mouse position, calculate the distance to each viewport edge
    const distanceToTop = event.clientY;
    const distanceToBottom = window.innerHeight - event.clientY;
    const distanceToLeft = event.clientX;
    const distanceToRight = window.innerWidth - event.clientX;

    // the closer the cursor is to the viewport edge, the stronger the scroll becomes
    // We calculate a progress value and square it (** 2) so scrolling accelerates more near the edge
    if (distanceToBottom < verticalEdgeOfWindow) {
      const progressInBottomZone = maxProgress - distanceToBottom / verticalEdgeOfWindow;
      verticalScrollAmount = ((progressInBottomZone ** 2) * maxVerticalScrollStrength);
    }

    if (distanceToTop < verticalEdgeOfWindow) {
      const progressInTopZone = maxProgress - distanceToTop / verticalEdgeOfWindow;
      verticalScrollAmount = -((progressInTopZone ** 2) * maxVerticalScrollStrength);
    }

    if (distanceToRight < horizontalEdgeOfWindow) {
      const progressInRightZone = maxProgress - distanceToRight / horizontalEdgeOfWindow;
      horizontalScrollAmount = ((progressInRightZone ** 2) * maxHorizontalScrollStrength);
    }

    if (distanceToLeft < horizontalEdgeOfWindow) {
      const progressInLeftZone = maxProgress - distanceToLeft / horizontalEdgeOfWindow;
      horizontalScrollAmount = -((progressInLeftZone ** 2) * maxHorizontalScrollStrength);
    }

    scrollSpeedVertical = verticalScrollAmount;
    scrollSpeedHorizontal = horizontalScrollAmount;
  };
  autoScroll(event);
  window.addEventListener('dragover', autoScroll);

  event.target.addEventListener('dragend', () => {

    window.removeEventListener('dragover', autoScroll);

    scrollSpeedVertical = 0;
    scrollSpeedHorizontal = 0;
    active = false;
  }, {
    once: true,
  });
}
