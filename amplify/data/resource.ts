import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { postConfirmation } from '../auth/post-confirmation/resource';

/**
 * Amplify Data (AppSync + DynamoDB) schema for ErgCoach.
 * Nested workout payloads (splits/strokes/feedback/analysis) are stored as JSON
 * to avoid high-cardinality relational fan-out on DynamoDB.
 *
 * Note: allow.resource() is only valid on the schema object (not per-model).
 */
const schema = a
  .schema({
    User: a
      .model({
        id: a.id().required(),
        email: a.email().required(),
        displayName: a.string().required(),
        authProvider: a.string().default('cognito'),
        externalAuthId: a.string(),
        athleteProfile: a.hasOne('AthleteProfile', 'userId'),
        subscription: a.hasOne('Subscription', 'userId'),
        dataConnections: a.hasMany('DataConnection', 'userId'),
      })
      .identifier(['id'])
      .authorization((allow) => [
        allow.owner().to(['read', 'update']),
        allow.authenticated('identityPool').to(['read', 'create', 'update']),
      ]),

    Subscription: a
      .model({
        userId: a.id().required(),
        plan: a.string().default('free'),
        status: a.string().default('inactive'),
        stripeCustomerId: a.string(),
        stripeSubscriptionId: a.string(),
        stripePriceId: a.string(),
        currentPeriodEnd: a.datetime(),
        cancelAtPeriodEnd: a.boolean().default(false),
        trialEndsAt: a.datetime(),
        isComplimentary: a.boolean().default(false),
        user: a.belongsTo('User', 'userId'),
      })
      .secondaryIndexes((index) => [
        index('userId'),
        index('stripeCustomerId'),
        index('stripeSubscriptionId'),
      ])
      .authorization((allow) => [
        allow.owner().to(['read']),
        allow.authenticated('identityPool').to(['read', 'create', 'update']),
      ]),

    AthleteProfile: a
      .model({
        userId: a.id().required(),
        dateOfBirth: a.datetime(),
        age: a.integer(),
        sex: a.string(),
        weightKg: a.float(),
        maxHeartRate: a.integer(),
        restingHeartRate: a.integer(),
        lactateThresholdHeartRate: a.integer(),
        preferredUnits: a.string().default('metric'),
        hrZoneMethod: a.string().default('lthr'),
        notes: a.string(),
        isSyntheticSeed: a.boolean().default(false),
        hrZones: a.json(),
        user: a.belongsTo('User', 'userId'),
        goals: a.hasMany('Goal', 'athleteId'),
        trainingPlans: a.hasMany('TrainingPlan', 'athleteId'),
        trainingBlocks: a.hasMany('TrainingBlock', 'athleteId'),
        workouts: a.hasMany('Workout', 'athleteId'),
        athleteTrends: a.hasMany('AthleteTrend', 'athleteId'),
        weeklyReviews: a.hasMany('WeeklyReview', 'athleteId'),
        chatMessages: a.hasMany('ChatMessage', 'athleteId'),
        coachState: a.hasOne('AthleteCoachState', 'athleteId'),
      })
      .secondaryIndexes((index) => [index('userId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    Goal: a
      .model({
        athleteId: a.id().required(),
        sport: a.string().required(),
        eventType: a.string().required(),
        targetDate: a.datetime(),
        targetDistance: a.float(),
        targetTimeSeconds: a.integer(),
        targetPaceSeconds500m: a.float(),
        status: a.string().default('active'),
        notes: a.string(),
        athlete: a.belongsTo('AthleteProfile', 'athleteId'),
        trainingPlans: a.hasMany('TrainingPlan', 'goalId'),
        trainingBlocks: a.hasMany('TrainingBlock', 'goalId'),
      })
      .secondaryIndexes((index) => [index('athleteId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    TrainingPlan: a
      .model({
        athleteId: a.id().required(),
        goalId: a.id(),
        name: a.string().required(),
        startDate: a.datetime().required(),
        endDate: a.datetime().required(),
        notes: a.string(),
        plannedWorkouts: a.json(),
        athlete: a.belongsTo('AthleteProfile', 'athleteId'),
        goal: a.belongsTo('Goal', 'goalId'),
        trainingBlocks: a.hasMany('TrainingBlock', 'trainingPlanId'),
      })
      .secondaryIndexes((index) => [index('athleteId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    TrainingBlock: a
      .model({
        athleteId: a.id().required(),
        goalId: a.id(),
        trainingPlanId: a.id(),
        name: a.string().required(),
        description: a.string(),
        blockType: a.string().required(),
        startDate: a.datetime().required(),
        endDate: a.datetime(),
        status: a.string().default('active'),
        targetEvent: a.string(),
        targetDistance: a.float(),
        targetTimeSeconds: a.integer(),
        targetPaceSeconds500m: a.float(),
        athlete: a.belongsTo('AthleteProfile', 'athleteId'),
        goal: a.belongsTo('Goal', 'goalId'),
        trainingPlan: a.belongsTo('TrainingPlan', 'trainingPlanId'),
        workouts: a.hasMany('Workout', 'trainingBlockId'),
      })
      .secondaryIndexes((index) => [index('athleteId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    AthleteCoachState: a
      .model({
        athleteId: a.id().required(),
        activeTrainingBlockId: a.id(),
        currentFitnessSummary: a.string(),
        strengths: a.json(),
        currentLimiters: a.json(),
        recentProgressSignals: a.json(),
        currentConcerns: a.json(),
        goalAssessment: a.json(),
        lastUpdatedAt: a.datetime(),
        athlete: a.belongsTo('AthleteProfile', 'athleteId'),
      })
      .secondaryIndexes((index) => [index('athleteId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    Workout: a
      .model({
        athleteId: a.id().required(),
        source: a.string().required(),
        externalId: a.string(),
        plannedWorkoutId: a.id(),
        trainingBlockId: a.id(),
        blockAssignment: a.string().default('none'),
        excludeFromAnalysis: a.boolean().default(false),
        startedAt: a.datetime().required(),
        sport: a.string().default('rower'),
        workoutType: a.string().default('unknown'),
        detectedClassification: a.string(),
        title: a.string(),
        durationSeconds: a.integer().required(),
        distanceMeters: a.float().required(),
        averagePaceSeconds500m: a.float(),
        averageWatts: a.float(),
        averageHeartRate: a.float(),
        maxHeartRate: a.float(),
        averageStrokeRate: a.float(),
        rawData: a.json(),
        isSyntheticSeed: a.boolean().default(false),
        splits: a.json(),
        strokes: a.json(),
        subjectiveFeedback: a.json(),
        analysis: a.json(),
        athlete: a.belongsTo('AthleteProfile', 'athleteId'),
        trainingBlock: a.belongsTo('TrainingBlock', 'trainingBlockId'),
      })
      .secondaryIndexes((index) => [index('athleteId'), index('trainingBlockId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    WeeklyReview: a
      .model({
        athleteId: a.id().required(),
        weekStart: a.datetime().required(),
        weekEnd: a.datetime().required(),
        summary: a.json().required(),
        aiNarrative: a.string(),
        athlete: a.belongsTo('AthleteProfile', 'athleteId'),
      })
      .secondaryIndexes((index) => [index('athleteId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    AthleteTrend: a
      .model({
        athleteId: a.id().required(),
        metricKey: a.string().required(),
        periodStart: a.datetime().required(),
        periodEnd: a.datetime().required(),
        value: a.float().required(),
        metadata: a.json(),
        athlete: a.belongsTo('AthleteProfile', 'athleteId'),
      })
      .secondaryIndexes((index) => [index('athleteId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    DataConnection: a
      .model({
        userId: a.id().required(),
        provider: a.string().required(),
        accessTokenEnc: a.string(),
        refreshTokenEnc: a.string(),
        tokenExpiresAt: a.datetime(),
        scope: a.string(),
        externalUserId: a.string(),
        metadata: a.json(),
        lastSyncAt: a.datetime(),
        user: a.belongsTo('User', 'userId'),
      })
      .secondaryIndexes((index) => [index('userId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),

    WebhookEvent: a
      .model({
        provider: a.string().required(),
        eventType: a.string().required(),
        payload: a.json().required(),
        processedAt: a.datetime(),
        status: a.string().default('pending'),
        error: a.string(),
      })
      .authorization((allow) => [
        allow.authenticated('identityPool').to(['read', 'create', 'update']),
      ]),

    ChatMessage: a
      .model({
        athleteId: a.id().required(),
        role: a.string().required(),
        content: a.string().required(),
        toolCalls: a.json(),
        athlete: a.belongsTo('AthleteProfile', 'athleteId'),
      })
      .secondaryIndexes((index) => [index('athleteId')])
      .authorization((allow) => [
        allow.owner(),
        allow.authenticated('identityPool').to(['read', 'create', 'update', 'delete']),
      ]),
  })
  .authorization((allow) => [allow.resource(postConfirmation)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
