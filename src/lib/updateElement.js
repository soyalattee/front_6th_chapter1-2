import { addEvent, removeEvent } from "./eventManager";
import { createElement } from "./createElement.js";

function updateAttributes(target, originNewProps, originOldProps) {
  Object.keys(originOldProps).forEach((key) => {
    console.log("originOldProps", originOldProps);
    // 이벤트면 이벤트 제거
    if (key === "onClick" || key === "onMouseOver" || key === "onFocus" || key === "onKeyDown") {
      removeEvent(target, key, originOldProps[key]);
    }
    //속성이면 속성에서제거
    target.removeAttribute(key);
  });
  Object.keys(originNewProps).forEach((key) => {
    if (key === "className") {
      target.setAttribute("class", originNewProps[key]);
    } else if (key === "onClick") {
      addEvent(target, "click", originNewProps[key]);
    } else if (key === "onMouseOver") {
      addEvent(target, "mouseover", originNewProps[key]);
    } else if (key === "onFocus") {
      addEvent(target, "focus", originNewProps[key]);
    } else if (key === "onKeyDown") {
      addEvent(target, "keydown", originNewProps[key]);
    } else {
      target.setAttribute(key, originNewProps[key]);
    }
  });
}

export function updateElement(parentElement, newNode, oldNode, index = 0) {
  console.log("updateElement", "parentElement: ", parentElement, "new: ", newNode, "old: ", oldNode, "index: ", index);
  if (oldNode.type === newNode.type) {
    if (newNode.props !== oldNode.props) {
      const el = parentElement.children[index];
      updateAttributes(el, newNode.props, oldNode.props);
    }
  }

  if (oldNode === null || oldNode === undefined) {
    parentElement.appendChild(createElement(newNode));
  } else if (newNode === null || newNode === undefined) {
    parentElement.removeChild(oldNode);
  } else if (newNode.type === oldNode.type) {
    if (newNode.props !== oldNode.props) {
      updateAttributes(oldNode, newNode.props, oldNode.props);
    }
  }
}
