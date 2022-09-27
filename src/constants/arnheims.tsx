enum GrantType {
  AUTHORIZATION_CODE,
  PASSWORD,
  IMPLICIT_GRANT,
}

type Scope = "read" | "write" | "hello";

class Arnheim {
  host: String;
  port: number;
  name: String;
  grantType: GrantType;
  clientSecret: String;
  clientId: String;
  scopes: Array<Scope>;

  constructor(
    name: String,
    host: String,
    port: number,
    grantType: GrantType,
    clientId: String,
    clientSecret: String,
    scopes: Array<Scope>
  ) {
    this.host = host;
    this.port = port;
    this.name = name;
    this.grantType = grantType;
    this.clientSecret = clientSecret;
    this.clientId = clientId;
    this.scopes = scopes;
  }
}

export const arnheims = [
  new Arnheim(
    "Local",
    "localhost",
    8000,
    GrantType.IMPLICIT_GRANT,
    "U80GQ1sxCPeJwOjNewzJOVUQoUElIu1rmRFoDWLm",
    "dD5vRJE45W7OeLaYfWzNQj7vMwe7rfrlemApFCfflwy4LvAZhL4pj5yk4JW7LvqUqQDTvv6RUDJXvRmZ68l7dsn0A4Rdprga9wqZHtaXbAO3dwYseJRDfGDq0CN4r9pl",
    ["read", "write"]
  ),
];
