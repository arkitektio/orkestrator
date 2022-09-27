import { Dialog } from '@headlessui/react';
import { Form, Formik } from 'formik';
import React from 'react';
import { SubmitButton } from '../../../components/forms/fields/SubmitButton';
import { TextInputField } from '../../../components/forms/fields/text_input';
import { useModal } from '../../../components/modals/modal-context';
import {
	CreateMirrorMutationVariables,
	RepositoriesDocument,
	ReserveParamsInput,
	useCreateMirrorMutation,
} from '../../api/graphql';
import { withArkitekt } from '../../arkitekt';

export type ReserveRequest = {
	params?: ReserveParamsInput;
	title?: string;
};

const CreateRepoModal: React.FC = ({}) => {
	const { close, show } = useModal();
	const [createMirror, data] = withArkitekt(useCreateMirrorMutation)({
		update(cache, result) {
			const existing: any = cache.readQuery({
				query: RepositoriesDocument,
			});
			cache.writeQuery({
				query: RepositoriesDocument,
				data: {
					repositories: existing.repositories.concat(
						result.data?.createMirror?.repo,
					),
				},
			});
		},
	});

	return (
		<Formik<CreateMirrorMutationVariables>
			initialValues={{
				url: '',
				name: '',
			}}
			onSubmit={async (values, { setSubmitting }) => {
				console.log(values);
				setSubmitting(true);
				await createMirror({ variables: values });
				setSubmitting(false);
				close();
			}}
		>
			{({ values, isSubmitting }) => (
				<Form>
					<div className="inline-block align-middle rounded bg-white text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
						<div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
							<div className="w-full">
								<div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
									<Dialog.Title
										as="h3"
										className="text-xl font-light mt-2 mb-4 leading-6 text-gray-900"
									>
										Create Mirror
									</Dialog.Title>
									<div className="mb-3 p-4 text-light border border-yellow-400 rounded">
										A mirror is a website that constantly updates
										definitions of Tasks that can be chosen to be
										implemented by the Applications
									</div>

									<TextInputField
										description="A helpful Name for you to organize this mirror"
										name="name"
										label="Name"
									/>
									<TextInputField
										description="Please make sure this website can handle an Arkitekt Request (see Manual for Implementation)"
										name="url"
										label="URL"
									/>
								</div>
							</div>
						</div>
						<div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
							<SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-blue-800 sm:ml-3 sm:w-auto sm:text-sm">
								{' '}
								Create Repo
							</SubmitButton>
							<button
								type="button"
								className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
								onClick={() => close()}
							>
								Cancel
							</button>
						</div>
					</div>
				</Form>
			)}
		</Formik>
	);
};

export { CreateRepoModal };
