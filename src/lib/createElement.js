import { addEvent } from "./eventManager";

export function createElement(vNode) {
  if (vNode === null || vNode === undefined || vNode === false || vNode === true) {
    return document.createTextNode("");
  }
  if (typeof vNode === "string") {
    return document.createTextNode(vNode);
  }
  if (typeof vNode === "number") {
    return document.createTextNode(vNode + "");
  }

  if (Array.isArray(vNode)) {
    const fragment = document.createDocumentFragment();
    vNode.forEach((child) => {
      const childElement = createElement(child);
      fragment.appendChild(childElement);
    });
    return fragment;
  }

  const el = document.createElement(vNode.type);
  if (vNode.props) {
    updateAttributes(el, vNode.props);
  }

  vNode.children.forEach((child) => {
    if (child && typeof child === "object" && child.type) {
      // vNode 객체인 경우 createElement로 재귀 처리
      el.appendChild(createElement(child));
    } else {
      // 문자열, 숫자 등 primitive 값인 경우 텍스트 노드로 생성
      const textNode = document.createTextNode(child || "");
      el.appendChild(textNode);
    }
  });
  return el;
}

function updateAttributes($el, props) {
  Object.entries(props).forEach(([key, value]) => {
    if (key === "className") {
      $el.setAttribute("class", value);
    } else if (key === "onClick") {
      addEvent($el, "click", value);
    } else if (key === "onMouseOver") {
      addEvent($el, "mouseover", value);
    } else if (key === "onFocus") {
      addEvent($el, "focus", value);
    } else if (key === "onKeyDown") {
      addEvent($el, "keydown", value);
    } else if (key === "onChange") {
      addEvent($el, "change", value);
    } else if (typeof value === "boolean") {
      value === true ? $el.setAttribute(key, "") : $el.removeAttribute(key);
    } else {
      $el.setAttribute(key, value);
    }
  });
}
