import { addEvent, removeEvent } from "./eventManager";
import { createElement } from "./createElement.js";

// 디버깅 플래그 - 환경변수나 전역변수로 제어 가능
const DEBUG_UPDATE_ELEMENT = globalThis.DEBUG_UPDATE_ELEMENT || true;

/**
 * DOM과 Virtual DOM의 일치성을 검사합니다
 * @param {Element} container - 부모 컨테이너
 * @param {*} oldNode - 이전 Virtual DOM 노드
 * @param {Element} currentElement - 현재 실제 DOM 요소
 * @param {number} index - 인덱스
 * @returns {boolean} - 불일치하면 true
 */
function detectDOMOutOfSync(container, oldNode, currentElement, index) {
  // 1. oldNode가 있는데 currentElement가 없는 경우
  if (oldNode && !currentElement) {
    if (DEBUG_UPDATE_ELEMENT) {
      console.warn(`🚨 oldNode가 있지만 실제 DOM 요소가 없음 (index: ${index})`);
    }
    return true;
  }

  // 2. oldNode가 없는데 currentElement가 있는 경우 (예상치 못한 DOM 요소)
  if (!oldNode && currentElement) {
    if (DEBUG_UPDATE_ELEMENT) {
      console.warn(`🚨 oldNode가 없지만 실제 DOM 요소가 존재 (index: ${index})`);
    }
    return true;
  }

  // 3. 둘 다 없으면 일치함
  if (!oldNode && !currentElement) {
    return false;
  }

  // 4. oldNode가 문자열인데 currentElement가 텍스트 노드가 아닌 경우
  if (typeof oldNode === "string") {
    if (!currentElement || currentElement.nodeType !== Node.TEXT_NODE) {
      if (DEBUG_UPDATE_ELEMENT) {
        console.warn(`🚨 oldNode는 텍스트이지만 실제 DOM은 텍스트 노드가 아님`);
      }
      return true;
    }
    // 텍스트 내용이 다른 경우는 불일치로 보지 않음 (업데이트로 처리)
    return false;
  }

  // 5. oldNode가 객체인데 currentElement가 Element가 아닌 경우
  if (typeof oldNode === "object" && oldNode.type) {
    if (!currentElement || currentElement.nodeType !== Node.ELEMENT_NODE) {
      if (DEBUG_UPDATE_ELEMENT) {
        console.warn(`🚨 oldNode는 요소이지만 실제 DOM은 Element가 아님`);
      }
      return true;
    }

    // 태그 이름이 다른 경우
    if (currentElement.tagName.toLowerCase() !== oldNode.type.toLowerCase()) {
      if (DEBUG_UPDATE_ELEMENT) {
        console.warn(`🚨 태그 이름 불일치: ${currentElement.tagName.toLowerCase()} !== ${oldNode.type.toLowerCase()}`);
      }
      return true;
    }

    // 자식 개수가 심각하게 다른 경우 (차이가 많이 나면 DOM 구조가 손상된 것으로 판단)
    const expectedChildCount = oldNode.children ? oldNode.children.length : 0;
    const actualChildCount = currentElement.childNodes.length;
    const childCountDiff = Math.abs(expectedChildCount - actualChildCount);

    // 자식 개수 차이가 너무 크면 DOM 구조가 손상된 것으로 판단
    if (childCountDiff > 2 && actualChildCount > 0) {
      if (DEBUG_UPDATE_ELEMENT) {
        console.warn(`🚨 자식 개수 차이가 너무 큼: 예상 ${expectedChildCount}, 실제 ${actualChildCount}`);
      }
      return true;
    }
  }

  // 그 외의 경우는 일치하는 것으로 판단
  return false;
}

/**
 * DOM 불일치 시 복구 전략을 선택합니다
 * @param {Element} container - 부모 컨테이너
 * @param {*} oldNode - 이전 Virtual DOM 노드
 * @param {*} newNode - 새로운 Virtual DOM 노드
 * @param {Element} currentElement - 현재 실제 DOM 요소
 * @param {number} index - 인덱스
 * @returns {string} - 'full-rerender' | 'replace-element' | 'continue'
 */
function chooseRecoveryStrategy(container, oldNode, newNode, currentElement, index) {
  // 1. 루트 레벨에서 심각한 불일치가 있으면 전체 재렌더링
  if (index === 0 && container.childNodes.length > 3) {
    return "full-rerender";
  }

  // 2. oldNode가 있는데 currentElement가 없는 경우
  if (oldNode && !currentElement) {
    // 새 노드도 있으면 추가하면 됨
    if (newNode) {
      return "replace-element"; // appendChild로 처리됨
    }
    return "continue"; // 제거할 것도 없으니 무시
  }

  // 3. oldNode가 없는데 currentElement가 있는 경우 (예상치 못한 DOM)
  if (!oldNode && currentElement) {
    // newNode가 있으면 교체, 없으면 제거
    return "replace-element";
  }

  // 4. 타입이 완전히 다른 경우
  if (typeof oldNode === "string" && currentElement?.nodeType !== Node.TEXT_NODE) {
    return "replace-element";
  }

  if (
    typeof oldNode === "object" &&
    oldNode.type &&
    currentElement?.tagName?.toLowerCase() !== oldNode.type.toLowerCase()
  ) {
    return "replace-element";
  }

  // 5. 자식 개수 차이가 너무 큰 경우
  if (typeof oldNode === "object" && oldNode.children && currentElement) {
    const expectedChildCount = oldNode.children.length;
    const actualChildCount = currentElement.childNodes.length;
    const childCountDiff = Math.abs(expectedChildCount - actualChildCount);

    // 차이가 너무 크면 해당 요소만 교체
    if (childCountDiff > 3) {
      return "replace-element";
    }
  }

  // 6. 그 외의 경우는 계속 진행 (작은 불일치는 무시)
  return "continue";
}

function updateAttributes(target, newProps, oldProps) {
  // target이 유효한 DOM 노드인지 확인
  if (!target || !target.setAttribute || !target.removeAttribute) {
    if (DEBUG_UPDATE_ELEMENT) {
      console.error("❌ updateAttributes: 유효하지 않은 target:", target);
    }
    return;
  }

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
        } else {
          target.setAttribute(key, newValue);
        }
      }
    });
  }
}

export function updateElement(container, newNode, oldNode, index = 0) {
  // 디버깅: 중요한 정보만 간결하게 로깅
  if (DEBUG_UPDATE_ELEMENT) {
    console.group(`🔄 updateElement (index: ${index})`);
  }

  // container 안전성 검사
  if (!container || !container.childNodes) {
    if (DEBUG_UPDATE_ELEMENT) {
      console.error("❌ Invalid container:", container);
      console.groupEnd();
    }
    return;
  }

  // oldNode와 newNode 차이점만 로깅
  if (DEBUG_UPDATE_ELEMENT && oldNode !== newNode) {
    if (!oldNode && newNode) {
      console.log("➕ 새 노드 추가:", typeof newNode === "string" ? `"${newNode}"` : newNode.type);
    } else if (oldNode && !newNode) {
      console.log("➖ 노드 제거:", typeof oldNode === "string" ? `"${oldNode}"` : oldNode.type);
    } else if (typeof oldNode === "string" && typeof newNode === "string") {
      console.log("📝 텍스트 변경:", `"${oldNode}" → "${newNode}"`);
    } else if (typeof oldNode === "object" && typeof newNode === "object") {
      if (oldNode.type !== newNode.type) {
        console.log("🏷️ 타입 변경:", `${oldNode.type} → ${newNode.type}`);
      } else if (JSON.stringify(oldNode.props) !== JSON.stringify(newNode.props)) {
        console.log("⚙️ Props 변경:", oldNode.props, "→", newNode.props);
      } else {
        const oldChildrenLength = oldNode.children ? oldNode.children.length : 0;
        const newChildrenLength = newNode.children ? newNode.children.length : 0;
        if (oldChildrenLength !== newChildrenLength) {
          console.log("👥 자식 개수 변경:", `${oldChildrenLength} → ${newChildrenLength}`);
        }
      }
    }
  }

  if (DEBUG_UPDATE_ELEMENT) {
    console.groupEnd();
  }

  // Case 1: 기존 노드 없음 -> 새 노드 추가
  if (!oldNode) {
    container.appendChild(createElement(newNode));
    return;
  }

  // Case 2: 새 노드 없음 -> 기존 노드 제거
  if (!newNode) {
    const currentElement = container.childNodes[index];
    if (currentElement) {
      container.removeChild(currentElement);
    }
    return;
  }
  // case 3: 둘 다없음
  if (!oldNode && !newNode) {
    return;
  }

  // currentElement 안전하게 가져오기와 DOM 일치성 검사
  const currentElement = container.childNodes[index];

  // DOM과 Virtual DOM 불일치 감지 및 처리
  const isDOMOutOfSync = detectDOMOutOfSync(container, oldNode, currentElement, index);
  if (isDOMOutOfSync) {
    if (DEBUG_UPDATE_ELEMENT) {
      console.warn("🚨 DOM과 Virtual DOM 불일치 감지 - 복구 시도");
    }

    // 복구 전략 선택
    const recoveryStrategy = chooseRecoveryStrategy(container, oldNode, newNode, currentElement, index);

    if (recoveryStrategy === "full-rerender") {
      if (DEBUG_UPDATE_ELEMENT) {
        console.warn("🔄 전체 재렌더링 수행");
      }
      container.innerHTML = "";
      container.appendChild(createElement(newNode));
      return;
    } else if (recoveryStrategy === "replace-element") {
      if (DEBUG_UPDATE_ELEMENT) {
        console.warn("🔧 개별 요소 교체");
      }
      if (currentElement) {
        container.replaceChild(createElement(newNode), currentElement);
      } else {
        container.appendChild(createElement(newNode));
      }
      return;
    } else if (recoveryStrategy === "continue") {
      if (DEBUG_UPDATE_ELEMENT) {
        console.warn("⚠️ 불일치 무시하고 계속 진행");
      }
      // 계속 진행
    }
  }

  // 인덱스가 범위를 벗어난 경우에만 로그
  if (DEBUG_UPDATE_ELEMENT && index >= container.childNodes.length && (oldNode || newNode)) {
    console.warn(`⚠️ index ${index}가 범위를 벗어남 (length: ${container.childNodes.length})`);
  }

  // 노드가 둘다 문자열인경우
  if (typeof oldNode === "string" && typeof newNode === "string") {
    if (oldNode !== newNode) {
      if (currentElement && currentElement.nodeType === Node.TEXT_NODE) {
        currentElement.textContent = newNode;
      } else {
        // 텍스트 노드가 아니면 새로 생성해서 교체
        const textNode = document.createTextNode(newNode);
        if (currentElement) {
          container.replaceChild(textNode, currentElement);
        } else {
          container.appendChild(textNode);
        }
      }
    }
    return;
  }
  // old가 문자열, new가 객체인경우
  if (typeof oldNode === "string" && typeof newNode === "object") {
    if (currentElement) {
      container.replaceChild(createElement(newNode), currentElement);
    } else {
      container.appendChild(createElement(newNode));
    }
    return;
  }

  // old가 객체, new가 문자열인경우
  if (typeof oldNode === "object" && typeof newNode === "string") {
    const textNode = document.createTextNode(newNode);
    if (currentElement) {
      container.replaceChild(textNode, currentElement);
    } else {
      container.appendChild(textNode);
    }
    return;
  }

  // Case 4: 둘다 있는데, 노드 타입이 다름 -> 완전 교체
  if (oldNode.type !== newNode.type) {
    if (currentElement) {
      container.replaceChild(createElement(newNode), currentElement);
    } else {
      container.appendChild(createElement(newNode));
    }
    return;
  }

  // Case 5: 같은 타입 -> 속성과 자식들 업데이트
  if (oldNode.type === newNode.type) {
    // currentElement가 유효한지 확인
    if (!currentElement) {
      if (DEBUG_UPDATE_ELEMENT) {
        console.error(`❌ currentElement가 없습니다. index: ${index}, container:`, container);
      }
      // currentElement가 없으면 새로 생성해서 추가
      container.appendChild(createElement(newNode));
      return;
    }

    // 속성 업데이트
    updateAttributes(currentElement, newNode.props, oldNode.props);

    // 자식 노드들 재귀적으로 업데이트
    const oldChildrenLength = oldNode.children ? oldNode.children.length : 0;
    const newChildrenLength = newNode.children ? newNode.children.length : 0;

    // 먼저 공통 범위 처리 (업데이트 또는 추가)
    const commonLength = Math.min(oldChildrenLength, newChildrenLength);
    for (let i = 0; i < commonLength; i++) {
      const oldChild = oldNode.children[i];
      const newChild = newNode.children[i];
      updateElement(currentElement, newChild, oldChild, i);
    }

    // 새로운 자식 추가
    for (let i = commonLength; i < newChildrenLength; i++) {
      const newChild = newNode.children[i];
      updateElement(currentElement, newChild, null, i);
    }

    // 초과하는 기존 자식들을 역순으로 제거
    if (oldChildrenLength > newChildrenLength) {
      if (DEBUG_UPDATE_ELEMENT) {
        console.log(`🗑️ 자식 노드 역순 제거: ${oldChildrenLength} → ${newChildrenLength}`);
      }
      for (let i = oldChildrenLength - 1; i >= newChildrenLength; i--) {
        const elementToRemove = currentElement.childNodes[i];
        if (elementToRemove) {
          if (DEBUG_UPDATE_ELEMENT) {
            console.log(`🗑️ 제거 (index ${i}):`, elementToRemove);
          }
          currentElement.removeChild(elementToRemove);
        }
      }
    }
  }
}
