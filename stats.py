from requests import get
import tkinter as tk
import streamlit as st  # type: ignore[reportMissingImports]

nfl_endpoint = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

response = get(nfl_endpoint)
data = response.json()

root = tk.Tk()
root.title("NFL Scores")
root.geometry("500x700")

# Create main frame with table
table_frame = tk.Frame(root)
table_frame.pack(fill="both", expand=True, padx=10, pady=10)

# Add header
header_frame = tk.Frame(table_frame, bg="#003087", height=40)
header_frame.pack(fill="x", pady=(0, 10))

tk.Label(header_frame, text="NFL WEEK 1", font=("Arial", 14, "bold"), fg="white", bg="#003087").pack(side="left", padx=10, pady=10)

# Add column headers
col_header_frame = tk.Frame(table_frame)
col_header_frame.pack(fill="x", pady=(0, 5))

tk.Label(col_header_frame, text="Away Team", font=("Arial", 10, "bold"), width=20, anchor="w").pack(side="left")
tk.Label(col_header_frame, text="Score", font=("Arial", 10, "bold"), width=10, anchor="e").pack(side="left")
tk.Label(col_header_frame, text="Home Team", font=("Arial", 10, "bold"), width=20, anchor="w").pack(side="left")
tk.Label(col_header_frame, text="Score", font=("Arial", 10, "bold"), width=10, anchor="e").pack(side="left")

# Extract and display final scores
for event in data.get('events', []):
    name = event['name']
    competition = event['competitions'][0]
    competitors = competition['competitors']

    away_team = competitors[1]['team']['displayName']
    away_score = competitors[1]['score']

    home_team = competitors[0]['team']['displayName']
    home_score = competitors[0]['score']

    # Create a row for each game
    game_row = tk.Frame(table_frame, relief="solid", borderwidth=1)
    game_row.pack(fill="x", pady=2)

    tk.Label(game_row, text=away_team, width=20, anchor="w", padx=5, pady=5).pack(side="left")
    tk.Label(game_row, text=away_score, width=10, anchor="e", padx=5, pady=5).pack(side="left")
    tk.Label(game_row, text=home_team, width=20, anchor="w", padx=5, pady=5).pack(side="left")
    tk.Label(game_row, text=home_score, width=10, anchor="e", padx=5, pady=5).pack(side="left")

root.mainloop()