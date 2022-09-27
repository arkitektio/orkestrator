export type Scopes = string;

export type Herre = {
  base_url: string;
  client_id: string;
  client_secret?: string;
  scopes: Scopes[];
  authorization_grant_type: string;
  redirect_uri?: string;
};

export type HerreUser = {
  sub?: string;
  roles?: string[];
  avatar?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
};

export type Token = string;
