import { env } from 'deno'
import createDebug, { enable } from './debug.ts'

const rista = createDebug('rista')
const krem = createDebug('krem')
const igor = createDebug('igor')

rista('blatruc')
rista('blatruc2')
krem('nikad neces videti ovo')

enable('krem,rista,-igor')

krem('evo meee')

igor('blablabla')

setTimeout(() => {
	rista('blatruc3')
}, 300);