//import { addEvent } from "./eventManager";

export function createElement(vNode) {
  if (vNode === null || vNode === undefined || vNode === false || vNode === true) {
    return { nodeType: Node.TEXT_NODE, textContent: "" };
  }
  if (typeof vNode === "string" || typeof vNode === "number") {
    return { nodeType: Node.TEXT_NODE, textContent: vNode + "" };
  }

  if (Array.isArray(vNode)) {
    return {
      nodeType: Node.DOCUMENT_FRAGMENT_NODE,
      childNodes: vNode.map((child) => createElement(child)),
    };
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
    if (child.type) {
      el.appendChild(createElement(child));
    } else {
      el.innerHTML += child;
    }
  });
  return el;
}

function updateAttributes($el, props) {
  Object.entries(props).forEach(([key, value]) => {
    if (key === "className") {
      $el.setAttribute("class", value);
    } else {
      $el.setAttribute(key, value);
    }
  });
}
