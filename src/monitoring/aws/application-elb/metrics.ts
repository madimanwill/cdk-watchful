import { Duration } from "aws-cdk-lib";
import { Metric, Statistic } from "aws-cdk-lib/aws-cloudwatch";

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

export class ApplicationELBMetricFactory {
  metricHostCounts(loadBalancerName: string) {
    return {
      HealthyHostCount: this.metric(
        Metrics.HealthyHostCount,
        loadBalancerName
      ).with({
        label: "Health Host Count",
        statistic: Statistic.MAXIMUM,
        color: "#ff7f0e",
      }),
      UnHealthyHostCount: this.metric(
        Metrics.UnHealthyHostCount,
        loadBalancerName
      ).with({
        label: "Unhealthy Host Count",
        statistic: Statistic.MAXIMUM,
        color: "#d62728",
      }),
    };
  }

  metricActiveConnectionCount(loadBalancerName: string) {
    return this.metric(Metrics.ActiveConnectionCount, loadBalancerName).with({
      label: "Active Connection Count",
      statistic: Statistic.SUM,
      color: "#ff7f0e",
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
}
