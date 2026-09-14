import polars as pl


def wr_yac_points(yac):
    if yac > 50:
        return 5
    if yac > 30:
        return 3
    if yac > 15:
        return 1
    return 0


def receiving_yards_points(receiving_yards):
    if receiving_yards > 200:
        return 5
    if receiving_yards > 150:
        return 3
    if receiving_yards > 100:
        return 1
    return 0

def receiving_tds_points(receiving_tds):
    if receiving_tds > 2:
        return 5
    if receiving_tds > 1:
        return 3
    if receiving_tds > 0:
        return 1
    return 0

def receptions_points(receptions):
    if receptions > 7:
        return 5
    if receptions > 5:
        return 3
    if receptions > 3:
        return 1
    return 0

def targets_points(targets):
    if targets > 10:
        return 5
    if targets > 7:
        return 3
    if targets > 4:
        return 1
    return 0

def target_share_points(target_share):
    if target_share > 0.30:
        return 5
    if target_share > 0.20:
        return 3
    if target_share > 0.10:
        return 1
    return 0

def receiving_air_yards_points(air_yards):
    if air_yards > 150:
        return 5
    if air_yards > 100:
        return 3
    if air_yards > 50:
        return 1
    return 0

def receiving_first_downs_points(first_downs):
    if first_downs > 6:
        return 5
    if first_downs > 4:
        return 3
    if first_downs > 2:
        return 1
    return 0

def receiving_fumbles_lost_points(fumbles_lost):
    if fumbles_lost >= 1:
        return -3
    return 0

def receiving_drop_points(drops):
    if drops >= 2:
        return -3
    if drops == 1:
        return -1
    return 0


def calculate_receiving_tds_points(wr_stats):
    return wr_stats.select("player_display_name",
  "receiving_tds").with_columns(
      pl.col("receiving_tds")
        .map_elements(receiving_tds_points, return_dtype=pl.Int64)
        .alias("receiving_tds_points")
)


def calculate_receiving_yards_points(wr_stats):
    return wr_stats.select("player_display_name",
  "receiving_yards").with_columns(
      pl.col("receiving_yards")
        .map_elements(receiving_yards_points, return_dtype=pl.Int64)
        .alias("receiving_yards_points")
)


def calculate_yac_points(wr_stats):
    return wr_stats.select("player_display_name",
  "receiving_yards_after_catch").with_columns(
      pl.col("receiving_yards_after_catch")
        .map_elements(wr_yac_points, return_dtype=pl.Int64)
        .alias("yac_points")
)


def calculate_receptions_points(wr_stats):
    return wr_stats.select("player_display_name",
  "receptions").with_columns(
      pl.col("receptions")
        .map_elements(receptions_points, return_dtype=pl.Int64)
        .alias("receptions_points")
)


def calculate_targets_points(wr_stats):
    return wr_stats.select("player_display_name",
  "targets").with_columns(
      pl.col("targets")
        .map_elements(targets_points, return_dtype=pl.Int64)
        .alias("targets_points")
)


def calculate_target_share_points(wr_stats):
    return wr_stats.select("player_display_name",
  "target_share").with_columns(
      pl.col("target_share")
        .map_elements(target_share_points, return_dtype=pl.Int64)
        .alias("target_share_points")
)


def calculate_receiving_air_yards_points(wr_stats):
    return wr_stats.select("player_display_name",
  "receiving_air_yards").with_columns(
      pl.col("receiving_air_yards")
        .map_elements(receiving_air_yards_points, return_dtype=pl.Int64)
        .alias("receiving_air_yards_points")
)


def calculate_receiving_first_downs_points(wr_stats):
    return wr_stats.select("player_display_name",
  "receiving_first_downs").with_columns(
      pl.col("receiving_first_downs")
        .map_elements(receiving_first_downs_points, return_dtype=pl.Int64)
        .alias("receiving_first_downs_points")
)


def calculate_receiving_fumbles_lost_points(wr_stats):
    return wr_stats.select("player_display_name",
  "receiving_fumbles_lost").with_columns(
      pl.col("receiving_fumbles_lost")
        .map_elements(receiving_fumbles_lost_points, return_dtype=pl.Int64)
        .alias("receiving_fumbles_lost_points")
)


def calculate_receiving_drop_points(drops_df):
    return drops_df.select("pfr_player_name",
  "receiving_drop").with_columns(
      pl.col("receiving_drop")
        .map_elements(receiving_drop_points, return_dtype=pl.Int64)
        .alias("receiving_drop_points")
)


def wr_formula(wr_stats, drops_df):
    yac = calculate_yac_points(wr_stats)
    yards = calculate_receiving_yards_points(wr_stats)
    tds = calculate_receiving_tds_points(wr_stats)
    receptions = calculate_receptions_points(wr_stats)
    targets = calculate_targets_points(wr_stats)
    target_share = calculate_target_share_points(wr_stats)
    air_yards = calculate_receiving_air_yards_points(wr_stats)
    first_downs = calculate_receiving_first_downs_points(wr_stats)
    fumbles_lost = calculate_receiving_fumbles_lost_points(wr_stats)
    drops = calculate_receiving_drop_points(drops_df).rename({"pfr_player_name": "player_display_name"})

    combined = (
        yac.join(yards, on="player_display_name")
           .join(tds, on="player_display_name")
           .join(receptions, on="player_display_name")
           .join(targets, on="player_display_name")
           .join(target_share, on="player_display_name")
           .join(air_yards, on="player_display_name")
           .join(first_downs, on="player_display_name")
           .join(fumbles_lost, on="player_display_name")
           .join(drops.select("player_display_name", "receiving_drop_points"), on="player_display_name", how="left")
           .with_columns(pl.col("receiving_drop_points").fill_null(0))
    )

    return combined.with_columns(
        (
            pl.col("yac_points")
            + pl.col("receiving_yards_points")
            + pl.col("receiving_tds_points")
            + pl.col("receptions_points")
            + pl.col("targets_points")
            + pl.col("target_share_points")
            + pl.col("receiving_air_yards_points")
            + pl.col("receiving_first_downs_points")
            + pl.col("receiving_fumbles_lost_points")
            + pl.col("receiving_drop_points")
        ).alias("total_score")
    ).sort("total_score", descending=True)
