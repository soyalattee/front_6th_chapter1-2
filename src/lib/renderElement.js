import { setupEventListeners } from "./eventManager";
import { createElement } from "./createElement";
import { normalizeVNode } from "./normalizeVNode";
// import { updateElement } from "./updateElement";

export function renderElement(vNode, container) {
  const normalizedVNode = normalizeVNode(vNode);

  // 최초 렌더링인지 확인 (이전 vNode가 없으면 최초)
  if (!container._prevVNode) {
    // 최초 렌더링: createElement로 DOM 생성
    console.log("최초 렌더링");
    const $el = createElement(normalizedVNode);
    container.innerHTML = ""; // 기존 내용 제거
    container.appendChild($el);

    // 이전 vNode 저장
    container._prevVNode = vNode;
    // 렌더링 완료 후 이벤트 등록
    setupEventListeners(container);
  } else {
    // 업데이트: updateElement로 기존 DOM 업데이트
    console.log("업데이트 렌더링");
    // const prevNormalizedVNode = normalizeVNode(container._prevVNode);
    const $el = createElement(normalizedVNode);
    container.innerHTML = "";
    container.appendChild($el);
    // updateElement(container, $el, prevNormalizedVNode);

    // 새로운 vNode로 업데이트
    container._prevVNode = vNode;
  }
}
