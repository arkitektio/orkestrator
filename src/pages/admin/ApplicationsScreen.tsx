import React, { useState } from "react";
import { BsCloudPlus } from "react-icons/bs";
import { IconButton } from "../../components/buttons/IconButton";
import { Modal } from "../../components/modals/Modal";
import { Application } from "../../man/components/Application";
import { Applications } from "../../man/components/Applications";
import { CreateApplicationModal } from "../../man/components/dialogs/CreateApplicationModal";
export type IApplicationsProps = {};

const ApplicationsScreen: React.FC<IApplicationsProps> = ({}) => {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  return (
    <div className={"grid grid-cols-12 gap-5 h-screen"}>
      <div className={"col-span-1 pl-2 pr-2"}>
        <Modal
          child={
            <IconButton icon={<BsCloudPlus />}>
              {" "}
              Create New Application
            </IconButton>
          }
        >
          <CreateApplicationModal
            onApplicationCreated={(app) =>
              setSelected(app.createApplication?.clientId)
            }
          />
        </Modal>
      </div>
      <div className={"col-span-6"}>
        <Applications onAppClicked={(clientID) => setSelected(clientID)} />
      </div>
      <div className={"col-span-5"}>
        {selected && <Application clientId={selected} />}
      </div>
    </div>
  );
};

export { ApplicationsScreen };
