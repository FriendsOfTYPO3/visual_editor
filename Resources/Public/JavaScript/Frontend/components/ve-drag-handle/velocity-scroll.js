import {dragInProgressStore} from '@typo3/visual-editor/Frontend/stores/drag-store';

export function initVelocityScroll() {

  let scrollSpeedVertical = 0;
  let scrollSpeedHorizontal = 0;

  let active = true;

  let lastFrameTime = Date.now();
  const interval = () => {

    const fps = 1000 / (Date.now() - lastFrameTime);
    lastFrameTime = Date.now();

    const oldSmoothScrollingBehavior = document.scrollingElement.style.scrollBehavior;
    document.scrollingElement.style.scrollBehavior = 'auto';

    const newVerticalScrollPosition = document.scrollingElement.scrollTop + scrollSpeedVertical / fps;
    const maxVerticalScrollPosition = document.scrollingElement.scrollHeight - window.innerHeight;
    const limitedVerticalScrollPosition = Math.max(0, Math.min(newVerticalScrollPosition, maxVerticalScrollPosition));
    const newHorizontalScrollPosition = document.scrollingElement.scrollLeft + scrollSpeedHorizontal / fps;
    const maxHorizontalScrollPosition = document.scrollingElement.scrollWidth - window.innerWidth;
    const limitedHorizontalScrollPosition = Math.max(0, Math.min(newHorizontalScrollPosition, maxHorizontalScrollPosition));

    if (limitedVerticalScrollPosition) {
      document.scrollingElement.scrollTop = limitedVerticalScrollPosition;
    }
    if (limitedHorizontalScrollPosition) {
      document.scrollingElement.scrollLeft = limitedHorizontalScrollPosition;
    }
    document.scrollingElement.style.scrollBehavior = oldSmoothScrollingBehavior;

    if (active) {
      requestAnimationFrame(interval);
    }
  }
  interval();

  return {
    /**
     * @param verticalPixelPerSecond {Number}
     * @param horizontalPixelPerSecond {Number}
     */
    setVelocity(verticalPixelPerSecond, horizontalPixelPerSecond) {
      scrollSpeedVertical = verticalPixelPerSecond;
      scrollSpeedHorizontal = horizontalPixelPerSecond;
    },
    destroy() {
      active = false;
    },
  };
}
