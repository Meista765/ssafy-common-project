import { Outlet } from 'react-router-dom'

import { Box, Container } from '@mui/material'

import Navbar from '../common/Navbar'

const NavbarLayout = () => {
  return (
    <Box>
      <Navbar />
      <Container maxWidth={false} disableGutters>
        <Outlet />
      </Container>
    </Box>
  )
}

export default NavbarLayout
