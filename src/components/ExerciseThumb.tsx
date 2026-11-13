import { useState } from 'react'
import { Icon } from './Icon'
import { imageUrl, libraryItem } from '../lib/library'
import type { Exercise } from '../types'

interface Props {
  exercise: Exercise | undefined
  selected?: boolean
  size?: number
}

/** Small round photo of the exercise, falls back to the first letter */
export function ExerciseThumb({ exercise, selected, size = 44 }: Props) {
  const [failed, setFailed] = useState(false)
  const lib = libraryItem(exercise)
  const src = lib ? imageUrl(lib, 0) : null
  const style = { width: size, height: size }
  if (selected) {
    return (
      <div className="avatar thumb" style={style}>
        <Icon name="check" size={18} stroke={3} />
      </div>
    )
  }
  if (!src || failed) {
    return (
      <div className="avatar thumb" style={style}>
        {exercise?.name[0] ?? '?'}
      </div>
    )
  }
  return (
    <img
      className="thumb-img"
      style={style}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
