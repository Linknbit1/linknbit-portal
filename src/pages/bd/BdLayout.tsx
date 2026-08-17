import { Outlet } from 'react-router-dom'
import { BdProvider } from '../../context/BdContext'

/**
 * Layout route for everything under /bd.
 *
 * The module's data is composed here rather than on each screen so it survives
 * navigation inside the module — opening a campaign from the list and coming back
 * would otherwise refetch the whole department, because the provider remounted.
 */
export default function BdLayout() {
  return (
    <BdProvider>
      <Outlet />
    </BdProvider>
  )
}
