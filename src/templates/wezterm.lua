local wezterm = require 'wezterm'
local config = wezterm.config_builder()

-- Ricekit theme integration
local colors_path = wezterm.home_dir .. "/Library/Application Support/Ricekit/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(colors_path)
config.colors = dofile(colors_path)

-- Add your customizations below
config.font_size = 14

return config
