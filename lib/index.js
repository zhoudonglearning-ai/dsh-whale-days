// 宿主半边：每次组装系统提示时，现算一行「相识第几天」。
// 为什么这样写：模型会忘、上下文会满，但日期是算出来的 —— 不占记忆。
import { compute, ensureData } from './days.js'

export const name = 'dsh-whale-days'
export const inject = ['systemPrompt']

export function apply(ctx) {
  const sp = ctx.get('systemPrompt')
  if (!sp) {
    ctx.logger?.warn?.('[whale-days] 找不到 systemPrompt 服务，跳过注射')
    return
  }
  ctx.effect(() => sp.section({
    name: 'dsh-whale-days',
    order: 9500,
    // 每次组装都重算：换天、跨会话、上下文压缩都不影响这一行
    text: () => {
      try {
        return compute(ensureData(), new Date()).line
      } catch {
        return ''
      }
    },
  }), 'dsh-whale-days: prompt section')
  ctx.logger?.info?.('[whale-days] 已挂上「相识天数」提示段')
}
