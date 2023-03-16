import { Dialog } from "@headlessui/react";
import { FieldArray, Form, Formik } from "formik";
import React from "react";
import { Link } from "react-router-dom";
import { SearchSelectInput } from "../../../components/forms/fields/search_select_input";
import { SelectInputField } from "../../../components/forms/fields/select_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { useModal } from "../../../components/modals/modal-context";
import { notEmpty } from "../../../floating/utils";
import {
  useDetailGroupQuery,
  useGroupOptionsLazyQuery,
  useUserOptionsLazyQuery,
  useUserQuery,
} from "../../../man/api/graphql";
import { withMan } from "../../../man/context";
import {
  ChangePermissionsMutationVariables,
  SharableModels,
  useChangePermissionsMutation,
  usePermissionsOfQuery,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

export const PermissionUserInfo = (props: { email: string }) => {
  const { data } = withMan(useUserQuery)({ variables: { email: props.email } });

  return (
    <div className="flex-row flex ">
      <div className="mr-4">
        <Link to={`/user/${data?.user?.id}`}>
          <img
            className="h-8 w-8 rounded-full cursor-pointer my-auto"
            src={
              data?.user?.avatar
                ? data?.user.avatar
                : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
            }
            alt=""
          />
        </Link>
      </div>
      <div className="font-light">
        {data?.user?.username}
        <br />
        <span className="text-xs">
          {data?.user?.firstName} {data?.user?.lastName}
        </span>
      </div>{" "}
    </div>
  );
};

export const PermisionGroupInfo = (props: { id: string }) => {
  const { data } = withMan(useDetailGroupQuery)({
    variables: { id: props.id },
  });

  return (
    <div className="flex-row flex ">
      <div className="mr-4">
        <Link to={`/group/${data?.group?.name}`}>
          <img
            className="h-8 w-8 rounded-full cursor-pointer my-auto"
            src={
              data?.group?.avatar
                ? data?.group.avatar
                : `https://eu.ui-avatars.com/api/?name=${data?.group?.name}&background=random`
            }
            alt="dddd"
          />
        </Link>
      </div>
      <div className="font-light">
        {data?.group?.name}
        <br />
      </div>{" "}
    </div>
  );
};

export const ShareModal: React.FC<{
  type: SharableModels;
  title?: string;
  object: string;
}> = ({ type, object, title }) => {
  const { close, show } = useModal();

  const [searchGroups] = withMan(useGroupOptionsLazyQuery)();
  const [searchUsers] = withMan(useUserOptionsLazyQuery)();

  const [changePermissions] = withMikro(useChangePermissionsMutation)();

  const { data, refetch } = withMikro(usePermissionsOfQuery)({
    variables: {
      model: type,
      id: object,
    },
  });

  return (
    <>
      {data?.permissionsOf && (
        <Formik<ChangePermissionsMutationVariables>
          initialValues={{
            type,
            object,
            userAssignments: data?.permissionsOf?.userAssignments
              ?.filter(notEmpty)
              .map((x) => ({
                user: x?.user.email,
                permissions: x?.permissions || [],
              })),
            groupAssignments: data?.permissionsOf?.groupAssignments
              ?.filter(notEmpty)
              .map((x) => ({
                group: x?.group.name,
                permissions: x?.permissions || [],
              })),
          }}
          validateOnBlur
          onSubmit={(values, { setSubmitting }) => {
            console.warn(values);
            setSubmitting(true);
            changePermissions({ variables: values }).then((ex) => {
              refetch().then((x) => setSubmitting(false));
            });
          }}
        >
          {(formikProps) => (
            <Form>
              <div className="inline-block align-middle bg-white rounded-lg border text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <div className=" px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start w-full">
                    <div className="mt-1 test-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <Dialog.Title
                        as="h3"
                        className="text-xl mt-2 mb-4 leading-6 font-medium text-gray-900"
                      >
                        {title && "Manage Permissions"}
                      </Dialog.Title>
                      <div className="mt-2 align-left text-left ">
                        <div className="mt-2 text-xl font-bold">
                          Permissions for User
                        </div>
                        <FieldArray
                          name="userAssignments"
                          render={(arrayHelpers) => (
                            <div className="mt-3">
                              {formikProps.values.userAssignments?.map(
                                (userAssignment, index) => (
                                  <div
                                    key={index}
                                    className="flex flex-row p-5 border border-gray-600 rounded mt-2"
                                  >
                                    <div className="flex-1 my-auto">
                                      {userAssignment?.user ? (
                                        <PermissionUserInfo
                                          email={userAssignment?.user}
                                        />
                                      ) : (
                                        <SearchSelectInput
                                          isMulti={false}
                                          lazySearch={searchUsers}
                                          name={`userAssignments.${index}.user`}
                                        />
                                      )}
                                    </div>
                                    <SelectInputField
                                      name={`userAssignments.${index}.permissions`}
                                      isMulti={true}
                                      className="flex-1"
                                      options={
                                        data?.permissionsOf?.options || []
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="ml-2 text-red-500 border border-red-300 px-2 py-1 my-auto"
                                      onClick={() => arrayHelpers.remove(index)} // remove a friend from the list
                                    >
                                      X
                                    </button>
                                  </div>
                                )
                              )}
                              <button
                                type="button"
                                className="mx-auto mt-2 text-blue-500 border border-blue-300 rounded px-2 py-1 my-auto"
                                onClick={() =>
                                  arrayHelpers.push({
                                    permissions: [],
                                  })
                                } // insert an empty string at a position
                              >
                                Add User
                              </button>
                            </div>
                          )}
                        />
                        <div className="mt-2 text-xl font-bold">
                          Permissions for Group
                        </div>
                        <FieldArray
                          name="groupAssignments"
                          render={(arrayHelpers) => (
                            <div className="mt-3">
                              {formikProps.values.groupAssignments?.map(
                                (groupAssignment, index) => (
                                  <div
                                    key={index}
                                    className="flex flex-row p-5 border border-gray-600 rounded mt-2"
                                  >
                                    <div className="flex-1 my-auto">
                                      {groupAssignment?.group ? (
                                        <PermisionGroupInfo
                                          id={groupAssignment?.group}
                                        />
                                      ) : (
                                        <SearchSelectInput
                                          isMulti={false}
                                          lazySearch={searchGroups}
                                          name={`groupAssignments.${index}.group`}
                                        />
                                      )}
                                    </div>
                                    <SelectInputField
                                      name={`groupAssignments.${index}.permissions`}
                                      isMulti={true}
                                      className="flex-1"
                                      options={
                                        data?.permissionsOf?.options || []
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="ml-2 text-red-500 border border-red-300 px-2 py-1 my-auto"
                                      onClick={() => arrayHelpers.remove(index)} // remove a friend from the list
                                    >
                                      X
                                    </button>
                                  </div>
                                )
                              )}
                              <button
                                type="button"
                                className="mx-auto mt-2 text-blue-500 border border-blue-300 rounded px-2 py-1 my-auto"
                                onClick={() =>
                                  arrayHelpers.push({
                                    permissions: [],
                                  })
                                } // insert an empty string at a position
                              >
                                Add Group
                              </button>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
                  <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                    {" "}
                    Save
                  </SubmitButton>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => close()}
                  >
                    Close
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </>
  );
};
