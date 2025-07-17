import { addEvent } from "./eventManager";

export function createElement(vNode) {
  if (vNode === null || vNode === undefined || vNode === false || vNode === true) {
    const el = document.createTextNode("");
    return el;
  }
  if (typeof vNode === "string") {
    const el = document.createTextNode(vNode);
    return el;
  }
  if (typeof vNode === "number") {
    const el = document.createTextNode(vNode + "");
    return el;
  }

  if (Array.isArray(vNode)) {
    const el = document.createDocumentFragment();
    vNode.forEach((child) => {
      el.appendChild(createElement(child));
    });
    return el;
  }
  if (typeof vNode === "function") {
    console.log("컴포넌트를 직접 사용할 수 없습니다. 정규화 필요"); //안되는것같다.
    throw new Error("컴포넌트를 직접 사용할 수 없습니다. 정규화 필요");
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
    } else if (key === "selected") {
      value === true ? $el.setAttribute("selected", "") : $el.removeAttribute("selected");
    } else if (key === "checked") {
      value === true ? $el.setAttribute("checked", "") : $el.removeAttribute("checked");
    } else if (typeof value === "boolean") {
      value === true ? $el.setAttribute(key, "") : $el.removeAttribute(key);
    } else {
      $el.setAttribute(key, value);
    }
  });
}
