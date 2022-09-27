import React from 'react';
import { useDetailWhaleQuery } from '../../api/graphql';
import { withPort } from '../../port';

export type IWhaleProps = {
	id: string;
};

const Whale: React.FC<IWhaleProps> = ({ id }) => {
	const { data } = withPort(useDetailWhaleQuery)({
		variables: { id: id },
	});

	return (
		<div className="p-5">
			<div className="text-xl font-light">{data?.whale?.image}</div>
			<div className="text-md mt-2">
				{JSON.stringify(data?.whale?.config)}
			</div>
		</div>
	);
};

export { Whale };
