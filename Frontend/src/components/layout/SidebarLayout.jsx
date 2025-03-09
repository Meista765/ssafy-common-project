import { Outlet, useLocation } from 'react-router-dom'

import { Stack } from '@mui/material'

import Sidebar from '../common/Sidebar'
import SidebarEdit from '../common/SidebarEdit'

const SidebarLayout = () => {
  const location = useLocation()
  const isEditPage = location.pathname.includes('/novel/edit')

  return (
    <Stack direction="row">
      {isEditPage ? <SidebarEdit /> : <Sidebar />}
      <Outlet />
    </Stack>
  )
}

export default SidebarLayout
