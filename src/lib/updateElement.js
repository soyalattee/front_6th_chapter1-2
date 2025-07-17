import { addEvent, removeEvent } from "./eventManager";
import { createElement } from "./createElement.js";

function updateAttributes(target, newProps, oldProps) {
  // 기존 속성들 제거
  if (oldProps) {
    Object.keys(oldProps).forEach((key) => {
      if (!(newProps && key in newProps)) {
        // 새 props에 없는 속성들 제거
        if (key.startsWith("on")) {
          // 이벤트 제거
          const eventType = key.slice(2).toLowerCase(); // onClick -> click
          removeEvent(target, eventType, oldProps[key]);
        } else if (key === "className") {
          target.removeAttribute("class");
        } else {
          target.removeAttribute(key);
        }
      }
    });
  }

  // 새 속성들 추가/업데이트
  if (newProps) {
    Object.keys(newProps).forEach((key) => {
      const newValue = newProps[key];
      const oldValue = oldProps ? oldProps[key] : undefined;

      // 값이 변경된 경우에만 업데이트
      if (newValue !== oldValue) {
        if (key === "className") {
          target.setAttribute("class", newValue);
        } else if (key === "onClick") {
          if (oldValue) removeEvent(target, "click", oldValue);
          addEvent(target, "click", newValue);
        } else if (key === "onMouseOver") {
          if (oldValue) removeEvent(target, "mouseover", oldValue);
          addEvent(target, "mouseover", newValue);
        } else if (key === "onFocus") {
          if (oldValue) removeEvent(target, "focus", oldValue);
          addEvent(target, "focus", newValue);
        } else if (key === "onKeyDown") {
          if (oldValue) removeEvent(target, "keydown", oldValue);
          addEvent(target, "keydown", newValue);
        } else if (key === "onChange") {
          if (oldValue) removeEvent(target, "change", oldValue);
          addEvent(target, "change", newValue);
        } else if (key === "onBlur") {
          if (oldValue) removeEvent(target, "blur", oldValue);
          addEvent(target, "blur", newValue);
        } else if (key === "checked") {
          target.checked = newValue; // ✅ 프로퍼티로 설정
        } else if (key === "selected") {
          target.selected = newValue; // ✅ 프로퍼티로 설정
        } else if (typeof newValue === "boolean") {
          newValue === true ? target.setAttribute(key, "") : target.removeAttribute(key);
        } else {
          target.setAttribute(key, newValue);
        }
      }
    });
  }
}

export function updateElement(container, newNode, oldNode, index = 0) {
  const currentElement = container.childNodes[index];

  // Case 1: 기존 노드 없음 -> 새 노드 추가
  if (!oldNode) {
    container.appendChild(createElement(newNode));
    return;
  }

  // Case 2: 새 노드 없음 -> 기존 노드 제거
  if (!newNode) {
    if (currentElement) {
      container.removeChild(currentElement);
    }
    return;
  }

  // Case 3: 둘 다 문자열/숫자인 경우
  if (typeof oldNode === "string" || typeof oldNode === "number") {
    if (typeof newNode === "string" || typeof newNode === "number") {
      if (oldNode !== newNode && currentElement) {
        currentElement.textContent = newNode;
      }
    } else {
      // 텍스트 -> 엘리먼트로 변경
      container.replaceChild(createElement(newNode), currentElement);
    }
    return;
  }

  if (typeof newNode === "string" || typeof newNode === "number") {
    // 엘리먼트 -> 텍스트로 변경
    const textNode = document.createTextNode(newNode + "");
    container.replaceChild(textNode, currentElement);
    return;
  }

  // Case 4: 노드 타입이 다름 -> 완전 교체
  if (oldNode.type !== newNode.type) {
    container.replaceChild(createElement(newNode), currentElement);
    return;
  }

  // Case 5: 같은 타입 -> 속성과 자식들 업데이트
  if (oldNode.type === newNode.type) {
    // 속성 업데이트
    updateAttributes(currentElement, newNode.props, oldNode.props);

    // 자식 노드들 재귀적으로 업데이트
    const maxLength = Math.max(
      oldNode.children ? oldNode.children.length : 0,
      newNode.children ? newNode.children.length : 0,
    );

    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldNode.children ? oldNode.children[i] : null;
      const newChild = newNode.children ? newNode.children[i] : null;

      updateElement(currentElement, newChild, oldChild, i);
    }
  }
}
