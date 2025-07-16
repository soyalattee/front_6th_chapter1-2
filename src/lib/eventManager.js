// 이벤트 목록 저장소
let eventRegistry = [];

//root 에 이벤트 리스너 등록
export function setupEventListeners(root) {
  // DOM에서 제거된 element들의 이벤트 정리
  eventRegistry = eventRegistry.filter((entry) => document.contains(entry.element));
  eventRegistry.forEach(({ eventType }) => {
    root.addEventListener(eventType, (e) => {
      eventRegistry
        .filter((entry) => entry.eventType === eventType)
        .forEach(({ element, handler }) => {
          if (element.contains(e.target)) {
            e.stopPropagation();
            handler(e);
          }
        });
    });
  });
}

export function addEvent(element, eventType, handler) {
  eventRegistry.push({ element, eventType, handler });
}

export function removeEvent(element, eventType, handler) {
  eventRegistry = eventRegistry.filter(
    (entry) => !(entry.element === element && entry.eventType === eventType && entry.handler === handler),
  );
  console.log("eventRegistry", eventRegistry);
}
