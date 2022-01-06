import { Duration } from "aws-cdk-lib";
import { Metric, Statistic } from "aws-cdk-lib/aws-cloudwatch";
import { WatchedOperation } from "../../../api-gateway";

const enum Metrics {
  //load balancers
  ActiveConnectionCount = "ActiveConnectionCount", //Sum
  ConsumedLCUs = "ConsumedLCUs", //All
  HTTP_Redirect_Count = "HTTP_Redirect_Count", //Sum
  //targets
  HealthyHostCount = "HealthyHostCount", //avg, max, min, Reported if health checks are enabled,
  UnHealthyHostCount = "UnHealthyHostCount", //avg, max, min, Reported if health checks are enabled
}

const Namespace = "AWS/ApplicationELB";
const StatisticP90 = "p90";
const StatisticP95 = "p95";
const StatisticP99 = "p99";

export class ApiGatewayMetricFactory {
  metricHostCounts(
    loadBalancerName: string,
    stage: string,
    op?: WatchedOperation
  ) {
    return {
      HealthyHostCount: this.metric(
        Metrics.HealthyHostCount,
        loadBalancerName,
        stage,
        op
      ).with({
        label: "Health Host Count",
        statistic: Statistic.MAXIMUM,
        color: "#ff7f0e",
      }),
      UnHealthyHostCount: this.metric(
        Metrics.UnHealthyHostCount,
        loadBalancerName,
        stage,
        op
      ).with({
        label: "Unhealthy Host Count",
        statistic: Statistic.MAXIMUM,
        color: "#d62728",
      }),
    };
  }

  metricCalls(loadBalancerName: string, stage: string, op?: WatchedOperation) {
    return this.metric(Metrics.Count, loadBalancerName, stage, op).with({
      label: "Calls",
      color: "#1f77b4",
      statistic: Statistic.SUM,
    });
    return {
      min: baseMetric.with({ label: "min", statistic: Statistic.MINIMUM }),
      avg: baseMetric.with({ label: "avg", statistic: Statistic.AVERAGE }),
      p90: baseMetric.with({ label: "p90", statistic: StatisticP90 }),
      p95: baseMetric.with({ label: "p95", statistic: StatisticP95 }),
      p99: baseMetric.with({ label: "p99", statistic: StatisticP99 }),
      max: baseMetric.with({ label: "max", statistic: Statistic.MAXIMUM }),
    };
  }

  metricLatency(
    loadBalancerName: string,
    stage: string,
    op?: WatchedOperation
  ) {
    const baseMetric = this.metric(
      Metrics.Latency,
      loadBalancerName,
      stage,
      op
    );

    return {
      min: baseMetric.with({ label: "min", statistic: Statistic.MINIMUM }),
      avg: baseMetric.with({ label: "avg", statistic: Statistic.AVERAGE }),
      p90: baseMetric.with({ label: "p90", statistic: StatisticP90 }),
      p95: baseMetric.with({ label: "p95", statistic: StatisticP95 }),
      p99: baseMetric.with({ label: "p99", statistic: StatisticP99 }),
      max: baseMetric.with({ label: "max", statistic: Statistic.MAXIMUM }),
    };
  }

  protected metric(
    metricName: Metrics,
    loadBalancerName: string,
    stage: string,
    op?: WatchedOperation
  ) {
    return new Metric({
      metricName,
      namespace: Namespace,
      period: Duration.minutes(1),
      dimensionsMap: {
        loadBalancerName: loadBalancerName,
        Stage: stage,
        ...(op && {
          Method: op.httpMethod,
          Resource: op.resourcePath,
        }),
      },
    });
  }
}
