const HAN_ERA_ORDINALS = ['元', '二', '三', '四', '五', '六'] as const;

/** Formats the limited era names currently supported by the prototype. */
export function eraLabel(year: number): string {
  if (year >= 184 && year <= 189) return `中平${HAN_ERA_ORDINALS[year - 184]}年`;
  return `年號待補（${year}年）`;
}
