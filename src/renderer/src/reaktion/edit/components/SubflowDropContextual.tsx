import { useRekuest } from '@/app/Arkitekt'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { rekuestActionToMatchingNode } from '@/reaktion/plugins/rekuest'
import { SubflowDropContextualParams } from '../../types'
import { useEditFlowStore } from '../context'
import { ContextualContainer } from './ContextualContainer'
import {
  ConstantActionDocument,
  ConstantActionQuery,
  DetailImplementationFragment,
  useImplementationsQuery
} from '@/rekuest/api/graphql'
import { StreamPort } from '@/reaktion/types'

const toPortMatches = (ports: StreamPort[] | undefined) => {
  return (
    ports?.map((port, index) => ({
      at: index,
      kind: port.kind,
      identifier: port.identifier,
      nullable: port.nullable,
      children: port.children?.map((child, childIndex) => ({
        at: childIndex,
        kind: child.kind,
        identifier: child.identifier,
        nullable: child.nullable,
      }))
    })) ?? []
  )
}

const ActionsSearch = ({
  agentId,
  params,
  onSelect
}: {
  agentId: string
  params: SubflowDropContextualParams
  onSelect: (impl: DetailImplementationFragment) => void
}) => {
  const droppedPorts =
    params.handleType === 'source'
      ? params.causingNode.data.outs[params.causingStream]
      : params.causingNode.data.ins[params.causingStream]

  const actionDemand =
    params.handleType === 'source'
      ? {
          key: `out-${params.causingStream}`,
          argMatches: toPortMatches(droppedPorts),
          forceArgLength: droppedPorts?.length ?? 0
        }
      : {
          key: `in-${params.causingStream}`,
          returnMatches: toPortMatches(droppedPorts),
          forceReturnLength: droppedPorts?.length ?? 0
        }

  const { data } = useImplementationsQuery({
    variables: {
      filters: {
        agent: {
          ids: [agentId]
        },
        actionDemand
      }
    }
  })

  return (
    <Command className="w-[320px]">
      <CommandInput placeholder="Search implementations..." />
      <CommandList>
        <CommandEmpty>No implementations found.</CommandEmpty>
        <CommandGroup heading="Implementations">
          {data?.implementations.map((impl) => (
            <CommandItem key={impl.id} onSelect={() => onSelect(impl)}>
              {impl.action.name} ({impl.interface})
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

export const SubflowDropContextual = (props: {
  params: SubflowDropContextualParams
}) => {
  const client = useRekuest()
  const addContextualNode = useEditFlowStore((s) => s.addContextualNode);

  const agentId = (props.params.subflowNode.data as { agent?: { id?: string } }).agent?.id
  const subflowTitle = props.params.subflowNode.data.title

  if (!agentId) {
    return null
  }

  const handleImplementationSelect = (impl: DetailImplementationFragment) => {
    client &&
      client
        .query({
          query: ConstantActionDocument,
          variables: { id: impl.action.id }
        })
        .then((event: { data?: ConstantActionQuery }) => {
          if (event.data?.action) {
            const flownode = rekuestActionToMatchingNode(event.data.action, {
              x: 0,
              y: 0
            })

            const flowdata = flownode.data as {
              binds?: { templates: string[] }
            }
            flowdata.binds = {
              ...flowdata.binds,
              templates: [impl.id]
            }

            addContextualNode(flownode, props.params)
          }
        })
  }

  return (
    <ContextualContainer
      active={true}
      style={{
        left: props.params.position.x,
        top: props.params.position.y,
        minWidth: 320
      }}
    >
      <div className="mb-2 text-xs text-muted-foreground">
        Add Action to {subflowTitle}
      </div>
      <ActionsSearch
        agentId={agentId}
        params={props.params}
        onSelect={handleImplementationSelect}
      />
    </ContextualContainer>
  )
}
