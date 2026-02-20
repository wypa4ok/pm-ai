function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1>{statusCode ? `${statusCode} - Server Error` : "Client Error"}</h1>
      <a href="/">Go home</a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
