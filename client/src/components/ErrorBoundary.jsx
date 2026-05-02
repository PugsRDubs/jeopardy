import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.message}>Please refresh the page to continue.</p>
          <button onClick={() => window.location.reload()} style={styles.button}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem'
  },
  title: {
    fontSize: '2rem',
    color: '#ff6b6b',
    marginBottom: '1rem'
  },
  message: {
    fontSize: '1.2rem',
    color: '#aaa',
    marginBottom: '2rem'
  },
  button: {
    padding: '0.8rem 2rem',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    background: '#4361ee',
    color: '#fff',
    borderRadius: '8px'
  }
}
