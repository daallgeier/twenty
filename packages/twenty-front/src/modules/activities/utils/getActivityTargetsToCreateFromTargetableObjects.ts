import { v4 } from 'uuid';

import { ActivityTarget } from '@/activities/types/ActivityTarget';
import { ActivityTargetableObject } from '@/activities/types/ActivityTargetableEntity';
import { flattenTargetableObjectsAndTheirRelatedTargetableObjects } from '@/activities/utils/flattenTargetableObjectsAndTheirRelatedTargetableObjects';
import { getActivityTargetObjectFieldIdName } from '@/activities/utils/getTargetObjectFilterFieldName';

export const getActivityTargetsToCreateFromTargetableObjects = ({
  targetableObjects,
  activityId,
}: {
  targetableObjects: ActivityTargetableObject[];
  activityId: string;
}): Partial<ActivityTarget>[] => {
  const activityTargetableObjects = targetableObjects
    ? flattenTargetableObjectsAndTheirRelatedTargetableObjects(
        targetableObjects,
      )
    : [];

  const activityTargetsToCreate = activityTargetableObjects.map(
    (targetableObject) => {
      const targetableObjectFieldIdName = getActivityTargetObjectFieldIdName({
        nameSingular: targetableObject.targetObjectNameSingular,
      });

      return {
        [targetableObject.targetObjectNameSingular]:
          targetableObject.targetObjectRecord,
        [targetableObjectFieldIdName]: targetableObject.id,
        activityId,
        id: v4(),
      };
    },
  );

  return activityTargetsToCreate;
};
