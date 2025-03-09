import PropTypes from 'prop-types'

import { Button } from '@mui/material'
import { styled } from '@mui/material/styles'

const StyledButton = styled(Button)(({ backgroundColor, color, hoverBackgroundColor }) => ({
  fontWeight: 500,
  fontSize: '1rem',
  width: 'fit-content',
  height: 'auto',
  borderRadius: 8,
  backgroundColor: backgroundColor,
  color: color,
  padding: '8px 16px',
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: hoverBackgroundColor,
  },
  '&.MuiButton-fullWidth': {
    width: '100%',
  },
}))

const PrimaryButton = ({
  children,
  startIcon,
  backgroundColor = '#FFA000',
  color = 'white',
  hoverBackgroundColor = '#FF8F00',
  ...props
}) => {
  return (
    <StyledButton
      variant="contained"
      startIcon={startIcon}
      backgroundColor={backgroundColor}
      color={color}
      hoverBackgroundColor={hoverBackgroundColor}
      {...props}
    >
      {children}
    </StyledButton>
  )
}

PrimaryButton.propTypes = {
  children: PropTypes.node.isRequired,
  startIcon: PropTypes.node,
  backgroundColor: PropTypes.string,
  color: PropTypes.string,
  hoverBackgroundColor: PropTypes.string,
}

export default PrimaryButton
