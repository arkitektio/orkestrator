export type ProtocolException = { type: string; message: string };
export type NodeException = { type: string; message: string };
export type ProviderException = { type: string; message: string };

export type ReserveExceptions = ProtocolException | ProviderException;
export type UnreserveExceptions =
	| ProtocolException
	| ProviderException;
export type AssignExceptions = ProtocolException | NodeException;

export type ReservationID = string;
export type ReserveParams = {
	providers?: [string];
	[key: string]: any;
};

export type NodeID = string;
export type TemplateID = string;
export type AssignationID = string;
export type Returns = [any];
export type Yields = [any];
export type Args = any[] | [];
export type Kwargs = { [key: string]: any };

export interface Extensions {
	[key: string]: any;
}

export interface DataModel {
	[key: string]: any;
}
export interface MetaModel<
	T extends string = any,
	Extension extends Extensions = {
		callback: string;
		progress: string;
	}
> {
	type: T;
	extensions?: Extension;
	reference: string;
}

export interface Message<T extends DataModel, M extends MetaModel> {
	data: T;
	meta: M;
}
