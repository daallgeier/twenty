import { useContext, useRef } from 'react';
import styled from '@emotion/styled';
import { DragDropContext, OnDragEndResponder } from '@hello-pangea/dnd'; // Atlassian dnd does not support StrictMode from RN 18, so we use a fork @hello-pangea/dnd https://github.com/atlassian/react-beautiful-dnd/issues/2350
import { useRecoilCallback, useRecoilValue } from 'recoil';

import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { useRecordBoardStates } from '@/object-record/record-board/hooks/internal/useRecordBoardStates';
import { RecordBoardColumn } from '@/object-record/record-board/record-board-column/components/RecordBoardColumn';
import { RecordBoardScope } from '@/object-record/record-board/scopes/RecordBoardScope';
import { DragSelect } from '@/ui/utilities/drag-select/components/DragSelect';
import { getScopeIdFromComponentId } from '@/ui/utilities/recoil-scope/utils/getScopeIdFromComponentId';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { FieldMetadataType } from '~/generated-metadata/graphql';

export type RecordBoardProps = {
  recordBoardId: string;
};

const StyledContainer = styled.div`
  border-top: 1px solid ${({ theme }) => theme.border.color.light};
  display: flex;
  flex: 1;
  flex-direction: row;
  margin-left: ${({ theme }) => theme.spacing(2)};
  margin-right: ${({ theme }) => theme.spacing(2)};
`;

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
  width: 100%;
`;

const StyledBoardHeader = styled.div`
  position: relative;
  z-index: 1;
`;

export const RecordBoard = ({ recordBoardId }: RecordBoardProps) => {
  const { updateOneRecord, objectMetadataItem } =
    useContext(RecordBoardContext);
  const boardRef = useRef<HTMLDivElement>(null);

  const { getColumnIdsState, columnsFamilySelector } =
    useRecordBoardStates(recordBoardId);
  const columnIds = useRecoilValue(getColumnIdsState());

  const selectFieldMetadataItem = objectMetadataItem.fields.find(
    (field) => field.type === FieldMetadataType.Select,
  );

  const onDragEnd: OnDragEndResponder = useRecoilCallback(
    ({ snapshot }) =>
      async (result) => {
        const draggedRecordId = result.draggableId;
        const destinationColumnId = result.destination?.droppableId;

        if (!destinationColumnId) {
          return;
        }

        const column = await snapshot
          .getLoadable(columnsFamilySelector(destinationColumnId))
          .getValue();

        if (!column) {
          return;
        }

        if (!selectFieldMetadataItem) {
          return;
        }

        updateOneRecord({
          idToUpdate: draggedRecordId,
          updateOneRecordInput: {
            [selectFieldMetadataItem.name]: column.value,
          },
        });
      },
    [columnsFamilySelector, selectFieldMetadataItem, updateOneRecord],
  );

  return (
    <RecordBoardScope
      recordBoardScopeId={getScopeIdFromComponentId(recordBoardId)}
      onColumnsChange={() => {}}
      onFieldsChange={() => {}}
    >
      <StyledWrapper>
        <StyledBoardHeader />
        <ScrollWrapper>
          <StyledContainer ref={boardRef}>
            <DragDropContext onDragEnd={onDragEnd}>
              {columnIds.map((columnId) => (
                <RecordBoardColumn
                  key={columnId}
                  recordBoardColumnId={columnId}
                />
              ))}
            </DragDropContext>
          </StyledContainer>
        </ScrollWrapper>
        <DragSelect
          dragSelectable={boardRef}
          onDragSelectionChange={() => {}}
        />
      </StyledWrapper>
    </RecordBoardScope>
  );
};
