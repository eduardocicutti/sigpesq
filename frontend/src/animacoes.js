import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

// Entrada discreta dos blocos da página a cada troca de tela.
// Usa só opacity, sem visibility, para não atrapalhar o foco no título.
export function useEntradaDaPagina(dependencias) {
  const area = useRef(null)

  // revertOnUpdate desfaz a animação anterior se a pessoa trocar de tela no meio dela.
  useGSAP(() => {
    const midia = gsap.matchMedia()
    // Quem pede menos movimento no sistema vê a tela pronta, sem animação.
    midia.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(area.current.children, {
        opacity: 0,
        y: 6,
        duration: 0.2,
        ease: 'power2.out',
        stagger: 0.03,
        clearProps: 'opacity,transform',
      })
    })
    return () => midia.revert()
  },{ dependencies: dependencias, scope: area, revertOnUpdate: true })

  return area
}
