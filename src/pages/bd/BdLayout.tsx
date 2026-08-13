import { Outlet } from 'react-router-dom'
import { BdPrototypeProvider } from '../../context/BdPrototypeContext'

/**
 * Layout route for everything under /bd.
 *
 * The prototype store lives here rather than on each screen so state survives
 * navigation inside the module — opening a project from the list and coming back
 * used to reset every unsaved change, because the provider remounted.
 */
export default function BdLayout() {
  return (
    <BdPrototypeProvider>
      <Outlet />
    </BdPrototypeProvider>
  )
}
