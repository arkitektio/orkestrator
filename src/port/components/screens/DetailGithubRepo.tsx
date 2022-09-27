import React from 'react';
import {
	useDetailGithubRepoQuery,
	useDetailWhaleQuery,
} from '../../api/graphql';
import { withPort } from '../../port';

export type IGithubRepoProps = {
	id: string;
};

const DetailGithubRepo: React.FC<IGithubRepoProps> = ({ id }) => {
	const { data } = withPort(useDetailGithubRepoQuery)({
		variables: { id: id },
	});

	return (
		<div className="p-5">
			<div className="text-xl font-light">
				{data?.githubRepo?.repo}
			</div>
			<div className="text-md mt-2">Nananananana you loser</div>
		</div>
	);
};

export { DetailGithubRepo };
