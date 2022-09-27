import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { PageLayout } from "../../../layout/PageLayout";
import { User } from "../../../man/screens/User";

export interface ManUserProps {}

export const ManUser: React.FC<ManUserProps> = (props) => {
  const { user } = useParams<{ user: string }>();

  if (!user) return <></>;

  return <User id={user} />;
};
