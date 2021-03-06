
import {CANVASSCENEW, isNumber, isRegularExpression, precision} from '../misc'

const [TTYPE, BTYPE, LTYPE, RTYPE, UNKNOWN] = ['T', 'B', 'L', 'R', 'UNKNOWN']

export {TTYPE, BTYPE, LTYPE, RTYPE, UNKNOWN}

export default class Collision {
	
	static deleteLastPXPYWHMap() { delete Collision.LastPXPYWHMap }

	static updateComponentInLastPXPYWHMap(componentIdentifier, map) {
		for (let q = 0; q < Collision.LastPXPYWHMap.length; q++) {
			const component = Collision.LastPXPYWHMap[q]
			if (componentIdentifier == component.componentIdentifier) {
				component.posx = map.posx
				component.posy = map.posy
				component.width = map.width
				component.height = map.height
				return true
			}
		}
	}

	static updateLastPXPYWHMap(components) {
		// [{componentIdentifier, posx, posy, width, height}, {componentIdentifier, posx, posy, width, height}]
		if (!Collision.LastPXPYWHMap) {
			Collision.LastPXPYWHMap = []
			for (let p = 0; p < components.length; p++) {
				const [component, componentIdentifier] = [components[p].component, components[p].componentIdentifier]
				const {posx, posy, width, height} = component
				Collision.LastPXPYWHMap[Collision.LastPXPYWHMap.length] = {componentIdentifier, posx, posy, width, height}
			}
		}
		else {
			// Change existing
			for(let p = 0; p < components.length; p++) {
				const [component, componentIdentifier] = [components[p].component, components[p].componentIdentifier]
				const {posx, posy, width, height} = component
				const changedExisting = this.updateComponentInLastPXPYWHMap(componentIdentifier, {posx, posy, width, height})
				// Add new
				if (!changedExisting) Collision.LastPXPYWHMap[Collision.LastPXPYWHMap.length] = {componentIdentifier, posx, posy, width, height}
			}

			// Remove irrelevant
			for (let q = 0; q < Collision.LastPXPYWHMap.length; q++) {
				const componentIdentifier = Collision.LastPXPYWHMap[q].componentIdentifier
				let shouldRemove = true
				for(let p = 0; p < components.length; p++) {
					if (componentIdentifier == components[p].componentIdentifier) {
						shouldRemove = false
						break
					}
				}
				if (shouldRemove) Collision.LastPXPYWHMap.splice(q--, 1)
			}
		}
		return Collision.LastPXPYWHMap
	}

	static detect(components, component, omission) {

		const isOmissionRegularExpression = isRegularExpression(omission)
		const {posx, posy, width, height, componentIdentifier} = component
		const [collisions, types] = [[], []]
		const [NPCPREFIXRE, OMISSIONS] = [/^(?:npc\-)/, RegExp(`^(?:(?:${componentIdentifier})|(?:bg))$`)]
		const NPC = NPCPREFIXRE.test(componentIdentifier)
		const _componentIdentifier = componentIdentifier

		const throwNewTypeError = property => { throw new TypeError(`Cannot detect collision. ${property} should be primitive-number`) }
		const p8 = number => precision(number, 8)

		const first = type => { for (let q = 0; q < collisions.length; q++) if (collisions[q].collisionType == type) return collisions[q] }
		
		const collisionPush = (componentIdentifier, collisionType, collisionOffset) => {
			if (false == types.includes(collisionType)) {
				types.push(collisionType)
			}
			collisions.push({componentIdentifier, collisionType, collisionOffset})
		}

		if (false == isNumber(posx)) throwNewTypeError('posx')
		if (false == isNumber(posy)) throwNewTypeError('posy')
		if (false == isNumber(width)) throwNewTypeError('width')
		if (false == isNumber(height)) throwNewTypeError('height')

		for (let q = 0; q < components.length; q++) {

			const [component, componentIdentifier] = [components[q].component, components[q].componentIdentifier]
			const OUTOFSCREEN = component.posx > CANVASSCENEW || component.posx + component.width < 0
			const skip = (isOmissionRegularExpression && omission.test(componentIdentifier)) || !NPC && OUTOFSCREEN || !component.collidable || OMISSIONS.test(componentIdentifier)
			if (skip) continue

			if (p8(posx + width) > p8(component.posx) && p8(posx) < p8(component.posx + component.width) && p8(posy + height) >= p8(component.posy) && p8(posy) <= p8(component.posy + component.height)) {
				let [prevComponentData1, prevComponentData2] = []
				for (let p = 0; p < Collision.LastPXPYWHMap.length; p++) {
					const prevComponentData = Collision.LastPXPYWHMap[p]
					if (prevComponentData1 && prevComponentData2) break
					if (prevComponentData.componentIdentifier == _componentIdentifier) prevComponentData1 = prevComponentData
					if (prevComponentData.componentIdentifier == componentIdentifier) prevComponentData2 = prevComponentData
				}
				if (prevComponentData1 && prevComponentData2) {
					const isTypeT = p8(prevComponentData1.posy + prevComponentData1.height) <= p8(prevComponentData2.posy)
					const isTypeB = p8(prevComponentData1.posy) >= p8(prevComponentData2.posy + prevComponentData2.height)
					const isTypeL = p8(prevComponentData1.posx + prevComponentData1.width) <= p8(prevComponentData2.posx)
					const isTypeR = p8(prevComponentData1.posx) >= p8(prevComponentData2.posx + prevComponentData2.width)
					if (isTypeT) {
						collisionPush(componentIdentifier, TTYPE, component.posy - (posy + height))
					}
					else if (isTypeB) {
						collisionPush(componentIdentifier, BTYPE, posy - (component.posy + component.height))
					}
					else if (isTypeL) {
						collisionPush(componentIdentifier, LTYPE, component.posx - (posx + width))
					}
					else if (isTypeR) {
						collisionPush(componentIdentifier, RTYPE, (component.posx + component.width) - posx)
					}
					else {
						collisionPush(componentIdentifier, UNKNOWN, undefined)
					}
				}
				else collisionPush(componentIdentifier, UNKNOWN, undefined)
			}
		}
		return {collisions, types, first, TTYPE, BTYPE, LTYPE, RTYPE, UNKNOWN}
	}
}