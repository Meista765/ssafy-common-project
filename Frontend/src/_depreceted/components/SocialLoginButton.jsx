import PropTypes from 'prop-types'

import { Button } from '@mui/material'
import { styled } from '@mui/material/styles'

const StyledButton = styled(Button)({
  width: '48px',
  height: '48px',
  minWidth: '48px',
  borderRadius: '50%',
  padding: 0,
  overflow: 'hidden',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },
})

const SocialLoginButton = ({ imgSrc, provider, onClick, ...props }) => {
  return (
    <StyledButton onClick={onClick} {...props}>
      <img src={imgSrc} alt={`${provider} 로그인`} />
    </StyledButton>
  )
}

SocialLoginButton.propTypes = {
  imgSrc: PropTypes.string.isRequired,
  provider: PropTypes.string.isRequired,
  onClick: PropTypes.func,
}

export default SocialLoginButton
