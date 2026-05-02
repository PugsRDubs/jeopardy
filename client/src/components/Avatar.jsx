import { getAvatarColor, getInitials } from '../utils/avatarColor'

function Avatar({ name, size = 40 }) {
  const bg = getAvatarColor(name)
  const initials = getInitials(name)
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: size * 0.38,
      flexShrink: 0,
      textTransform: 'uppercase'
    }}>
      {initials}
    </div>
  )
}

export default Avatar
