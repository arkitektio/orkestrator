export type TransportSettings = {
	type: string;
	kwargs: {
		base_urL: string;
	};
};

export type AgentSettings = {
	endpoint_url: string;
	instance_id: string;
};

export type PostmanSettings = {
	endpoint_url: string;
	instance_id: string;
};

export type Arkitekt = {
	endpoint_url: string;
	ws_endpoint_url: string;
	healthz: string;
	secure: boolean;
	postman: PostmanSettings;
	agent: AgentSettings;
	instance_id: string;
};

export type Args = any[] | [];
export type Returns = any[] | [];
export type Kwargs = { [key: string]: string } | {};
