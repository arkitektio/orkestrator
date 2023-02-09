import { FieldArray, Form, Formik } from "formik";
import React from "react";
import { Link } from "react-router-dom";
import { notEmpty } from "../../floating/utils";
import {
  useDetailGroupQuery,
  useGroupOptionsLazyQuery,
  useUserOptionsLazyQuery,
  useUserQuery,
} from "../../lok/api/graphql";
import { withMan } from "../../lok/context";
import {
  ChangePermissionsMutationVariables,
  useChangePermissionsMutation,
  usePermissionsOfQuery,
  SharableModels,
} from "../../rekuest/api/graphql";
import { useMikro, withMikro } from "../../mikro/MikroContext";
import { SearchSelectInput } from "../forms/fields/search_select_input";
import { SelectInputField } from "../forms/fields/select_input";
import { SubmitButton } from "../forms/fields/SubmitButton";
import { withRekuest } from "../../rekuest";
import { ResponsiveContainerGrid } from "../layout/ResponsiveContainerGrid";
import { User } from "../../linker";

export const PermissionUserInfo = (props: { sub: string }) => {
  const { data } = withMan(useUserQuery)({ variables: { id: props.sub } });
  const { s3resolve } = useMikro();

  return (
    <div className="flex-row flex ">
      <div className="mr-4">
        <User.DetailLink object={props.sub}>
          <img
            className="h-8 w-8 rounded-full cursor-pointer my-auto"
            src={
              data?.user?.profile?.avatar
                ? s3resolve(data?.user?.profile?.avatar)
                : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
            }
            alt=""
          />
        </User.DetailLink>
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
  const { s3resolve } = useMikro();

  return (
    <div className="flex-row flex ">
      <div className="mr-4">
        <Link to={`/group/${data?.group?.name}`}>
          <img
            className="h-8 w-8 rounded-full cursor-pointer my-auto"
            src={
              data?.group?.profile?.avatar
                ? s3resolve(data?.group?.profile?.avatar)
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

export const RekuestShare: React.FC<{
  type: SharableModels;
  title?: string;
  object: string;
}> = ({ type, object, title }) => {
  const [searchGroups] = withMan(useGroupOptionsLazyQuery)();
  const [searchUsers] = withMan(useUserOptionsLazyQuery)();

  const [changePermissions] = withRekuest(useChangePermissionsMutation)();

  const { data, refetch } = withRekuest(usePermissionsOfQuery)({
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
                user: x?.user?.sub,
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
              <div className="mt-2 align-left text-left @container ">
                <div className="mt-2 font-bold text-white">
                  Permissions for User
                </div>
                <FieldArray
                  name="userAssignments"
                  render={(arrayHelpers) => (
                    <ResponsiveContainerGrid>
                      {formikProps.values.userAssignments?.map(
                        (userAssignment, index) => (
                          <div
                            key={index}
                            className="relative flex flex-row p-5 border border-gray-600 rounded mt-2 group"
                          >
                            <div className="flex-1 my-auto">
                              {userAssignment?.user ? (
                                <PermissionUserInfo
                                  sub={userAssignment?.user}
                                />
                              ) : (
                                <SearchSelectInput
                                  isMulti={false}
                                  lazySearch={searchUsers}
                                  className="text-black "
                                  name={`userAssignments.${index}.user`}
                                />
                              )}
                            </div>
                            <SelectInputField
                              name={`userAssignments.${index}.permissions`}
                              isMulti={true}
                              className="flex-1 text-black outline-none  block"
                              options={data?.permissionsOf?.options || []}
                            />
                            <button
                              type="button"
                              className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full group-hover:block px-3 hidden"
                              onClick={() => arrayHelpers.remove(index)} // remove a friend from the list
                            >
                              x
                            </button>
                          </div>
                        )
                      )}
                      <button
                        type="button"
                        className="w-full mt-2 text-primary-500 border border-primary-300 rounded px-2 py-1 my-auto"
                        onClick={() =>
                          arrayHelpers.push({
                            permissions: [],
                          })
                        } // insert an empty string at a position
                      >
                        Add User
                      </button>
                    </ResponsiveContainerGrid>
                  )}
                />
                <div className="mt-2 font-bold">Permissions for Group</div>
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
                              options={data?.permissionsOf?.options || []}
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
                        className="w-full mt-2 text-primary-500 border border-primary-300 rounded px-2 py-1 my-auto"
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
                <div className=" px-4 pb-2 sm:flex sm:flex-row-reverse">
                  <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-primary-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
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
