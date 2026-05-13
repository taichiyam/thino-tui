import { useRef, useState } from "react"

export type Bindings = {
  onMouseOver: () => void
  onMouseOut: () => void
  onMouseDown: () => void
  onMouseUp: () => void
}

export type PressableState = {
  isHovered: boolean
  isPressed: boolean
  bind: Bindings
}

export type Options = {
  isDisabled?: boolean
  onPress?: () => void
}

/** Tracks hover and press state for a focusable element and exposes mouse handlers ready for spread. */
export function usePressable(options?: Options): PressableState {
  const isDisabled = options?.isDisabled ?? false
  const onPress = options?.onPress

  const [isHovered, setHovered] = useState(false)
  const [isPressed, setPressed] = useState(false)

  // mousedown と mouseup が同じイベントループで処理されると state 更新が
  // 間に合わず isPressed の closure が古くて onPress が呼ばれない問題を回避。
  const pressedRef = useRef(false)

  const bind: Bindings = {
    onMouseOver: () => {
      if (!isDisabled) setHovered(true)
    },
    onMouseOut: () => {
      setHovered(false)
      pressedRef.current = false
      setPressed(false)
    },
    onMouseDown: () => {
      if (isDisabled) return
      pressedRef.current = true
      setPressed(true)
    },
    onMouseUp: () => {
      if (isDisabled) return
      if (pressedRef.current) onPress?.()
      pressedRef.current = false
      setPressed(false)
    },
  }

  return { isHovered, isPressed, bind }
}
