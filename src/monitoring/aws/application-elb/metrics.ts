import { MathExpression, Metric, Statistic } from "aws-cdk-lib/aws-cloudwatch";

import { Duration } from "aws-cdk-lib";

const enum Metrics {
  ActiveConnectionCount = "ActiveConnectionCount", //Sum
  ConsumedLCUs = "ConsumedLCUs", //All
  HealthyHostCount = "HealthyHostCount",
  UnHealthyHostCount = "UnHealthyHostCount",
  TARGET_2XX_COUNT = "HTTPCode_Target_2XX_Count",
  TARGET_3XX_COUNT = "HTTPCode_Target_3XX_Count",
  TARGET_4XX_COUNT = "HTTPCode_Target_4XX_Count",
  TARGET_5XX_COUNT = "HTTPCode_Target_5XX_Count",
  TargetResponseTime = "TargetResponseTime",
  RequestCount = "RequestCount",
}

const Namespace = "AWS/ApplicationELB";

export class ApplicationELBMetricFactory {
  metricActiveConnectionCount(loadBalancerName: string) {
    return this.metric(Metrics.ActiveConnectionCount, loadBalancerName).with({
      label: "Active Connection Count",
      statistic: Statistic.SUM,
    });
  }

  metricConsumedLCUs(loadBalancerName: string) {
    return this.metric(Metrics.ConsumedLCUs, loadBalancerName).with({
      label: "Consumed LCUs",
      statistic: Statistic.MAXIMUM,
    });
  }

  metricMinHealthyHostCount(targetGroup: string, loadBalancer: string) {
    return this.targetMetric(
      Metrics.HealthyHostCount,
      targetGroup,
      loadBalancer
    ).with({ statistic: Statistic.MINIMUM });
  }

  metricMaxUnhealthyHostCount(targetGroup: string, loadBalancer: string) {
    return this.targetMetric(
      Metrics.UnHealthyHostCount,
      targetGroup,
      loadBalancer
    ).with({ statistic: Statistic.MAXIMUM });
  }

  metricTargetResponseTime(targetGroup: string, loadBalancer: string) {
    const baseMetric = this.targetMetric(
      Metrics.TargetResponseTime,
      targetGroup,
      loadBalancer
    );

    return {
      min: baseMetric.with({ statistic: Statistic.MINIMUM }),
      max: baseMetric.with({ statistic: Statistic.MAXIMUM }),
      avg: baseMetric.with({ statistic: Statistic.AVERAGE }),
    };
  }

  metricRequestCount(targetGroup: string, loadBalancer: string) {
    return this.targetMetric(
      Metrics.RequestCount,
      targetGroup,
      loadBalancer
    ).with({ statistic: Statistic.SUM });
  }

  metricHttpErrorStatusCodeRate(targetGroup: string, loadBalancer: string) {
    const requests = this.metricRequestCount(targetGroup, loadBalancer);
    const errors = this.metricHttpStatusCodeCount(targetGroup, loadBalancer);
    return new MathExpression({
      expression: "http4xx + http5xx / requests",
      usingMetrics: {
        http4xx: errors.count4XX,
        http5xx: errors.count5XX,
        requests,
      },
    });
  }

  metricHttpStatusCodeCount(targetGroup: string, loadBalancer: string) {
    return {
      count2XX: this.targetMetric(
        Metrics.TARGET_2XX_COUNT,
        targetGroup,
        loadBalancer
      ).with({ statistic: Statistic.SUM }),
      count3XX: this.targetMetric(
        Metrics.TARGET_3XX_COUNT,
        targetGroup,
        loadBalancer
      ).with({ statistic: Statistic.SUM }),
      count4XX: this.targetMetric(
        Metrics.TARGET_4XX_COUNT,
        targetGroup,
        loadBalancer
      ).with({ statistic: Statistic.SUM }),
      count5XX: this.targetMetric(
        Metrics.TARGET_5XX_COUNT,
        targetGroup,
        loadBalancer
      ).with({ statistic: Statistic.SUM }),
    };
  }

  protected metric(metricName: Metrics, loadBalancerName: string) {
    return new Metric({
      metricName,
      namespace: Namespace,
      period: Duration.minutes(5),
      dimensionsMap: {
        LoadBalancer: loadBalancerName,
      },
    });
  }

  protected targetMetric(
    metricName: Metrics,
    loadBalancerName: string,
    targetGroup: string
  ) {
    return new Metric({
      metricName,
      namespace: Namespace,
      period: Duration.minutes(5),
      dimensionsMap: {
        LoadBalancer: loadBalancerName,
        TargetGroup: targetGroup,
      },
    });
  }
}
