// Custom error page for static export compatibility
// This overrides Next.js's default _error page which uses _document.js

function Error({ statusCode }) {
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      height: '100vh',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'white'
    }}>
      <div>
        <h1 style={{
          display: 'inline-block',
          margin: '0 20px 0 0',
          padding: '0 23px 0 0',
          fontSize: '24px',
          fontWeight: 500,
          verticalAlign: 'top',
          lineHeight: '49px',
          borderRight: '1px solid rgba(0, 0, 0, 0.3)'
        }}>
          {statusCode || 'Error'}
        </h1>
        <div style={{
          display: 'inline-block'
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: '49px',
            margin: 0
          }}>
            {statusCode === 404
              ? 'This page could not be found'
              : 'An error occurred'}
          </h2>
        </div>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
