import { Metric, Statistic } from "aws-cdk-lib/aws-cloudwatch";

import { Duration } from "aws-cdk-lib";

const enum Metrics {
  //load balancers
  ActiveConnectionCount = "ActiveConnectionCount", //Sum
  ConsumedLCUs = "ConsumedLCUs", //All
  HTTP_Redirect_Count = "HTTP_Redirect_Count", //Sum
  ProcessedBytes = "ProcessedBytes", //Sum
  //targets
  HealthyHostCount = "HealthyHostCount", //avg, max, min, Reported if health checks are enabled,
  UnHealthyHostCount = "UnHealthyHostCount", //avg, max, min, Reported if health checks are enabled
}

const Namespace = "AWS/ApplicationELB";

export class ApplicationELBMetricFactory {
  metricHostCounts(loadBalancerName: string, targetGroup: string) {
    return {
      HealthyHostCount: this.targetMetric(
        Metrics.HealthyHostCount,
        loadBalancerName,
        targetGroup
      ).with({
        label: "Health Host Count",
        statistic: Statistic.MAXIMUM,
        color: "#00FF00",
      }),
      UnHealthyHostCount: this.targetMetric(
        Metrics.UnHealthyHostCount,
        loadBalancerName,
        targetGroup
      ).with({
        label: "Unhealthy Host Count",
        statistic: Statistic.MAXIMUM,
        color: "#FF0000",
      }),
    };
  }

  metricActiveConnectionCount(loadBalancerName: string) {
    return this.metric(Metrics.ActiveConnectionCount, loadBalancerName).with({
      label: "Active Connection Count",
      statistic: Statistic.SUM,
      color: "#0000FF",
    });
  }

  metricConsumedLCUs(loadBalancerName: string) {
    return this.metric(Metrics.ConsumedLCUs, loadBalancerName).with({
      label: "Consumed LCUs",
      statistic: Statistic.MAXIMUM,
      color: "#FFA500",
    });
  }

  metricHTTP_Redirect_Count(loadBalancerName: string) {
    return this.metric(Metrics.HTTP_Redirect_Count, loadBalancerName).with({
      label: "HTTP Redirect Count",
      statistic: Statistic.SUM,
      color: "#7F00FF",
    });
  }

  metricProcessedBytes(loadBalancerName: string) {
    return this.metric(Metrics.ProcessedBytes, loadBalancerName).with({
      label: "Processed Bytes",
      statistic: Statistic.SUM,
      color: "#FFFF00",
    });
  }

  protected metric(metricName: Metrics, loadBalancerName: string) {
    return new Metric({
      metricName,
      namespace: Namespace,
      period: Duration.minutes(1),
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
      period: Duration.minutes(1),
      dimensionsMap: {
        LoadBalancer: loadBalancerName,
        TargetGroup: targetGroup,
      },
    });
  }
}
